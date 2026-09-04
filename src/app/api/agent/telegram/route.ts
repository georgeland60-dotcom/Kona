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
import { registrarCambios } from "@/lib/historial-data";
import { anotarConsumo } from "@/lib/consumo-data";
import { tipoDeCambio, categoriaAfectada } from "@/lib/agent/tools";
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

type Usuario = { id: number; first_name?: string; username?: string };

type TelegramUpdate = {
  message?: {
    message_id: number;
    // En un grupo el id es NEGATIVO (ej -1001234567890); en un chat
    // uno a uno es positivo. Los dos sirven igual.
    chat: { id: number; type?: string; title?: string };
    from?: Usuario;
    text?: string;
    caption?: string;
    voice?: { file_id: string };
    audio?: { file_id: string };
  };
  callback_query?: {
    id: string;
    data?: string;
    from?: Usuario;
    message?: { message_id: number; chat: { id: number; type?: string } };
  };
};

// Cómo llamamos a quien escribió, para dejar constancia de quién pidió
// y quién aprobó cada cambio (importante cuando el grupo tiene 2 personas).
function nombreDe(usuario?: Usuario): string {
  return usuario?.first_name || usuario?.username || "alguien";
}

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

<b>Si estamos en un grupo</b>
Cualquiera del grupo me puede pedir cambios, y cualquiera puede confirmarlos. Siempre dejo escrito quién pidió y quién confirmó cada cambio.

Siempre muestro los cambios antes de aplicarlos: nada se toca sin confirmación.
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
  const enGrupo = mensaje.chat.type === "group" || mensaje.chat.type === "supergroup";
  const quien = nombreDe(mensaje.from);

  if (!autorizado(chatId)) {
    await enviarMensaje(
      chatId,
      enGrupo
        ? `Este grupo todavía no está autorizado.\n\nAgrega este número (con el signo menos incluido) a la variable <code>TELEGRAM_ALLOWED_CHAT_IDS</code>:\n<code>${chatId}</code>`
        : `No tienes permiso para usar este asistente.\n\nSi eres la dueña de la tienda, agrega este número a la variable <code>TELEGRAM_ALLOWED_CHAT_IDS</code>:\n<code>${chatId}</code>`
    );
    return;
  }

  // En un grupo, Telegram manda los comandos como "/ayuda@nombre_del_bot",
  // y la gente suele escribir "@nombre_del_bot ponle 20%". Le quitamos la
  // mención para que la IA lea la orden limpia.
  const texto = (mensaje.text || mensaje.caption || "")
    .replace(/^(@\w+\s+)+/, "")
    .trim();

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

  // Dejamos anotado lo que costó, para poder ver el consumo en el panel
  // con datos reales en vez de estimaciones.
  await anotarConsumo({
    llamadas: resultado.gasto.llamadas,
    tokensEntrada: resultado.gasto.tokensEntrada,
    tokensSalida: resultado.gasto.tokensSalida,
  });

  if (resultado.tipo === "respuesta") {
    // En un grupo colgamos la respuesta del mensaje original, para que se
    // vea a cuál de las dos personas le estamos contestando.
    await enviarMensaje(chatId, escapar(resultado.texto), undefined, {
      responderA: enGrupo ? mensaje.message_id : undefined,
    });
    return;
  }

  // Hay cambios que proponer: los mostramos y esperamos confirmación.
  const codigo = await guardarPlan(chatId, resultado.acciones, quien);

  // Si el plan no se pudo guardar, el botón "Confirmar" fallaría al
  // apretarlo. Preferimos decirlo ahora y no ofrecer un botón inútil.
  if (!codigo) {
    await enviarMensaje(
      chatId,
      "⚠️ Entendí lo que quieres, pero <b>no puedo guardarlo</b>: falta conectar la base de datos.\n\n" +
        "Hay que agregar Upstash Redis (gratis) desde Vercel → Storage. Está explicado en AGENTE.md.",
      undefined,
      { responderA: enGrupo ? mensaje.message_id : undefined }
    );
    return;
  }

  await enviarMensaje(
    chatId,
    textoDelPlan(resultado.texto, resultado.acciones, enGrupo ? quien : undefined),
    [
      { texto: "✅ Confirmar", dato: `ok:${codigo}` },
      { texto: "✖️ Cancelar", dato: `no:${codigo}` },
    ],
    { responderA: enGrupo ? mensaje.message_id : undefined }
  );
}

function textoDelPlan(
  comentario: string,
  acciones: AccionPlan[],
  pedidoPor?: string
): string {
  const lista = acciones
    .map((a, i) => `${i + 1}. ${escapar(a.resumen)}`)
    .join("\n");

  const encabezado = pedidoPor
    ? `<b>${escapar(pedidoPor)} pidió esto:</b>`
    : "<b>Voy a hacer esto:</b>";
  const partes = [`${encabezado}\n${lista}`];

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

  const enGrupo =
    consulta.message?.chat.type === "group" ||
    consulta.message?.chat.type === "supergroup";
  // En un grupo cualquiera de los dos puede apretar el botón, así que
  // dejamos escrito quién fue.
  const quien = nombreDe(consulta.from);

  if (!autorizado(chatId)) {
    await responderBoton(consulta.id, "Sin permiso");
    return;
  }

  const [accion, codigo] = (consulta.data || "").split(":");

  if (accion === "no") {
    await descartarPlan(codigo);
    await responderBoton(consulta.id, "Cancelado");
    await editarMensaje(
      chatId,
      messageId,
      enGrupo
        ? `✖️ ${escapar(quien)} canceló. No cambié nada.`
        : "✖️ Cancelado. No cambié nada."
    );
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
  const { hechos, fallos, detalle } = await aplicarPlan(acciones);

  if (hechos.length > 0) refrescarTienda();

  // Dejamos constancia de lo que se aplicó, para la trazabilidad del panel.
  // Si esto fallara no debe tumbar la respuesta: el cambio ya está hecho y
  // lo importante es que la dueña se entere.
  try {
    await registrarCambios(
      await Promise.all(
        detalle.map(async (d) => ({
          quien,
          origen: "telegram" as const,
          tipo: tipoDeCambio(d.herramienta),
          categoria: await categoriaAfectada(d.herramienta, d.args),
          resumen: d.resumen,
          detalle: d.mensaje,
          ok: d.ok,
        }))
      )
    );
  } catch {
    // El historial es un extra: no vale la pena romper nada por él.
  }

  const lineas: string[] = [];
  if (hechos.length > 0) {
    const titulo = enGrupo
      ? `✅ <b>Listo</b> (confirmado por ${escapar(quien)})`
      : "✅ <b>Listo</b>";
    lineas.push(`${titulo}\n${hechos.map((h) => `• ${escapar(h)}`).join("\n")}`);
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
