// =============================================================
//  WEBHOOK DE TELEGRAM — la puerta de entrada del agente
//
//  Telegram avisa a esta dirección cada vez que la dueña escribe o
//  manda un audio al bot. El flujo es siempre el mismo:
//
//    mensaje  ->  el agente entiende  ->  propone un plan
//             ->  la dueña aprieta "Confirmar"  ->  se aplica
//
//  Nada se cambia en la tienda sin ese "Confirmar".
// =============================================================

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { ejecutarAgente, aplicarPlan, type AccionPlan } from "@/lib/agent/run";
import { guardarPlan, tomarPlan, descartarPlan } from "@/lib/agent/pending";
import { ErrorAgente, type Parte } from "@/lib/agent/gemini";
import { isPersistent } from "@/lib/kv";
import {
  enviarMensaje,
  editarMensaje,
  responderBoton,
  mostrarEscribiendo,
  descargarAudio,
  escapar,
} from "@/lib/agent/telegram";

// El agente puede tardar unos segundos (piensa y consulta el catálogo).
export const maxDuration = 60;

// ---- Forma de lo que manda Telegram ---------------------------------

type TelegramUpdate = {
  message?: {
    message_id: number;
    chat: { id: number };
    text?: string;
    caption?: string;
    voice?: { file_id: string };
    audio?: { file_id: string };
  };
  callback_query?: {
    id: string;
    data?: string;
    message?: { message_id: number; chat: { id: number } };
  };
};

// ---- Permisos --------------------------------------------------------

// Solo los chats de esta lista pueden mandarle órdenes al agente.
function chatsAutorizados(): number[] {
  return (process.env.TELEGRAM_ALLOWED_CHAT_IDS || "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n !== 0);
}

function autorizado(chatId: number): boolean {
  return chatsAutorizados().includes(chatId);
}

const AYUDA = `
¡Hola! Soy el asistente de <b>Kona Moda</b>. Escríbeme o mándame un audio, como le hablarías a una persona.

<b>Lo que puedo hacer</b>
• Descuentos: <i>"mete 20% a todos los vestidos hasta el domingo"</i>
• Precios: <i>"el pantalón Killa ahora cuesta 129"</i>
• Ofertas: <i>"pon el top Princess en oferta a 39"</i>
• Productos: <i>"agrega blusa Lila a 79 en blusas, tallas S M L"</i>
• Quitar: <i>"saca de la web la casaca jean"</i>
• Stock: <i>"el vestido Pams se agotó"</i>
• Temporada: <i>"crea la temporada Verano y mete la ropa de baño"</i>

<b>Lo que NO puedo hacer</b>
Cambiar el diseño de la página, ver pedidos o datos de clientes, ni subir fotos (esas van por el panel /admin).

Siempre te muestro los cambios antes de aplicarlos: nada se toca sin tu confirmación.
`.trim();

// ---- Entrada ---------------------------------------------------------

export async function POST(req: Request) {
  // 1) Que el aviso venga de verdad de Telegram y no de un curioso.
  const secreto = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (
    !secreto ||
    req.headers.get("x-telegram-bot-api-secret-token") !== secreto
  ) {
    return new Response("no autorizado", { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return Response.json({ ok: true });
  }

  // 2) Le respondemos YA a Telegram (si no, reintenta el mismo mensaje)
  //    y hacemos el trabajo pesado después de contestar.
  after(async () => {
    try {
      if (update.callback_query) await atenderBoton(update);
      else if (update.message) await atenderMensaje(update);
    } catch (error) {
      const chatId =
        update.message?.chat.id ?? update.callback_query?.message?.chat.id;
      if (chatId) {
        const detalle =
          error instanceof ErrorAgente
            ? error.message
            : "Se me cruzaron los cables. Intenta de nuevo, por favor.";
        await enviarMensaje(chatId, `⚠️ ${escapar(detalle)}`);
      }
    }
  });

  return Response.json({ ok: true });
}

// ---- Mensajes (texto y audio) ---------------------------------------

async function atenderMensaje(update: TelegramUpdate): Promise<void> {
  const mensaje = update.message!;
  const chatId = mensaje.chat.id;

  if (!autorizado(chatId)) {
    await enviarMensaje(
      chatId,
      `No tienes permiso para usar este asistente.\n\nSi eres la dueña de la tienda, agrega este número a la variable <code>TELEGRAM_ALLOWED_CHAT_IDS</code>:\n<code>${chatId}</code>`
    );
    return;
  }

  const texto = (mensaje.text || mensaje.caption || "").trim();

  if (/^\/(start|ayuda|help)/i.test(texto)) {
    await enviarMensaje(chatId, AYUDA);
    return;
  }

  // Armamos lo que le vamos a dar a la IA: el texto, el audio, o los dos.
  const partes: Parte[] = [];
  const audioId = mensaje.voice?.file_id || mensaje.audio?.file_id;

  if (audioId) {
    await mostrarEscribiendo(chatId);
    const audio = await descargarAudio(audioId);
    if (!audio) {
      await enviarMensaje(
        chatId,
        "No pude escuchar ese audio (quizá es muy largo). ¿Me lo mandas más corto o escrito?"
      );
      return;
    }
    partes.push({
      inlineData: { mimeType: audio.mimeType, data: audio.base64 },
    });
    if (texto) partes.push({ text: texto });
  } else if (texto) {
    partes.push({ text: texto });
  } else {
    await enviarMensaje(
      chatId,
      "Mándame un texto o una nota de voz diciéndome qué quieres cambiar."
    );
    return;
  }

  await mostrarEscribiendo(chatId);
  const resultado = await ejecutarAgente(partes);

  if (resultado.tipo === "respuesta") {
    await enviarMensaje(chatId, escapar(resultado.texto));
    return;
  }

  // Hay cambios que proponer: los mostramos y esperamos confirmación.
  const codigo = await guardarPlan(chatId, resultado.acciones);
  await enviarMensaje(chatId, textoDelPlan(resultado.texto, resultado.acciones), [
    { texto: "✅ Confirmar", dato: `ok:${codigo}` },
    { texto: "✖️ Cancelar", dato: `no:${codigo}` },
  ]);
}

function textoDelPlan(comentario: string, acciones: AccionPlan[]): string {
  const lista = acciones
    .map((a, i) => `${i + 1}. ${escapar(a.resumen)}`)
    .join("\n");

  const partes = [`<b>Voy a hacer esto:</b>\n${lista}`];

  if (comentario) partes.push(escapar(comentario));

  // Sin base de datos configurada, en producción los cambios se pierden
  // al rato. Mejor avisarlo antes de que confirme, no después.
  if (process.env.NODE_ENV === "production" && !isPersistent()) {
    partes.push(
      "⚠️ <b>Ojo:</b> falta configurar la base de datos (KV), así que estos cambios NO se van a guardar. Revisa AGENTE.md."
    );
  }

  partes.push("¿Lo aplico?");
  return partes.join("\n\n");
}

// ---- Botones (Confirmar / Cancelar) ---------------------------------

async function atenderBoton(update: TelegramUpdate): Promise<void> {
  const consulta = update.callback_query!;
  const chatId = consulta.message?.chat.id;
  const messageId = consulta.message?.message_id;
  if (!chatId || !messageId) return;

  if (!autorizado(chatId)) {
    await responderBoton(consulta.id, "Sin permiso");
    return;
  }

  const [accion, codigo] = (consulta.data || "").split(":");

  if (accion === "no") {
    await descartarPlan(codigo);
    await responderBoton(consulta.id, "Cancelado");
    await editarMensaje(chatId, messageId, "✖️ Cancelado. No cambié nada.");
    return;
  }

  if (accion !== "ok") {
    await responderBoton(consulta.id);
    return;
  }

  // "tomarPlan" borra el plan al leerlo, así que si aprieta dos veces
  // el botón, la segunda no vuelve a aplicar los cambios.
  const acciones = await tomarPlan(codigo, chatId);
  if (!acciones) {
    await responderBoton(consulta.id, "Ese plan ya venció");
    await editarMensaje(
      chatId,
      messageId,
      "Este plan ya se aplicó o venció. Mándame el pedido de nuevo."
    );
    return;
  }

  await responderBoton(consulta.id, "Aplicando…");
  const { hechos, fallos } = await aplicarPlan(acciones);

  if (hechos.length > 0) refrescarTienda();

  const lineas: string[] = [];
  if (hechos.length > 0) {
    lineas.push(
      `✅ <b>Listo</b>\n${hechos.map((h) => `• ${escapar(h)}`).join("\n")}`
    );
  }
  if (fallos.length > 0) {
    lineas.push(
      `⚠️ <b>No pude con esto</b>\n${fallos.map((f) => `• ${escapar(f)}`).join("\n")}`
    );
  }
  if (lineas.length === 0) lineas.push("No se cambió nada.");

  if (hechos.length > 0) {
    lineas.push("<i>Los cambios ya están en la web.</i>");
  }

  await editarMensaje(chatId, messageId, lineas.join("\n\n"));
}

// Le avisa a Next.js que las páginas de la tienda cambiaron, para que
// las vuelva a generar con los precios nuevos.
function refrescarTienda(): void {
  revalidatePath("/");
  revalidatePath("/tienda");
  revalidatePath("/producto/[slug]", "page");
  revalidatePath("/admin/productos");
  revalidatePath("/admin/descuentos");
  revalidatePath("/admin/inventario");
}
