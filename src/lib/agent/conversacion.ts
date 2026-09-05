// =============================================================
//  ATENDER UN PEDIDO DE PRINCIPIO A FIN
//
//  Aquí vive el ciclo completo: pensar, avisar cómo va, y entregar la
//  respuesta o el plan con sus botones. Lo usan por igual el webhook de
//  Telegram (primera tanda) y el endpoint de continuación (las
//  siguientes), para que el comportamiento sea exactamente el mismo.
//
//  Dos cosas que importan y son fáciles de perder de vista:
//   - NUNCA se termina en silencio. Si algo se corta, se dice.
//   - Mientras piensa, avisa cada minuto. Un mensaje quieto no distingue
//     "sigo trabajando" de "me caí", y esa duda es peor que la espera.
// =============================================================

import {
  ejecutarAgente,
  type AccionPlan,
  type EstadoAgente,
  type GastoAgente,
  type ResultadoAgente,
} from "@/lib/agent/run";
import { guardarSesion, type Sesion } from "@/lib/agent/sesion";
import { guardarPlan } from "@/lib/agent/pending";
import { ErrorAgente } from "@/lib/agent/gemini";
import { anotarConsumo, anotarFreno } from "@/lib/consumo-data";
import { isPersistent } from "@/lib/kv";
import {
  enviarMensaje,
  editarMensaje,
  escapar,
  type Boton,
} from "@/lib/agent/telegram";

// Cada cuánto avisa que sigue trabajando.
const CADA_MS = 60_000;

// Cuánto puede pensar en UNA tanda.
//
// Se queda muy por debajo de maxDuration a propósito. Los planes de
// alojamiento tienen su propio techo (el más bajo mata la función al
// minuto), y si la tanda se pasara de ese techo el pedido moriría entero
// en vez de continuar. Con 45 segundos funciona con cualquier techo: si
// hace falta más tiempo, simplemente se encadenan más tandas hasta la
// media hora. Prima que no se rompa, no ahorrar unos saltos.
export const PRESUPUESTO_TANDA_MS = Number(
  process.env.AGENTE_TANDA_MS || 45_000
);

// ---- Avisos ----------------------------------------------------------

function minutosDesde(inicio: number): number {
  return Math.max(1, Math.round((Date.now() - inicio) / 60_000));
}

// El texto del aviso que se va editando mientras piensa.
function textoDeEspera(estado: EstadoAgente): string {
  const min = minutosDesde(estado.inicio);
  return (
    `🤔 Sigo armando la modificación… (${min} min)\n` +
    `<i>Es un pedido con varias piezas; cuando lo tenga te muestro la lista para confirmar.</i>`
  );
}

// ---- Entregar el resultado -------------------------------------------

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

// Manda el texto final: editando el aviso si existe, o como mensaje nuevo.
async function responder(
  sesion: Sesion,
  texto: string,
  botones?: Boton[]
): Promise<void> {
  if (sesion.avisoId) {
    await editarMensaje(sesion.chatId, sesion.avisoId, texto, botones);
  } else {
    await enviarMensaje(sesion.chatId, texto, botones, {
      responderA: sesion.responderA,
    });
  }
}

async function entregar(
  sesion: Sesion,
  resultado: Extract<ResultadoAgente, { tipo: "respuesta" | "plan" }>
): Promise<void> {
  if (resultado.tipo === "respuesta") {
    await responder(sesion, escapar(resultado.texto));
    return;
  }

  const codigo = await guardarPlan(
    sesion.chatId,
    resultado.acciones,
    sesion.quien
  );

  // Si el plan no se pudo guardar, el botón "Confirmar" fallaría al
  // apretarlo. Preferimos decirlo ahora y no ofrecer un botón inútil.
  if (!codigo) {
    await responder(
      sesion,
      "⚠️ Entendí lo que quieres, pero <b>no puedo guardarlo</b>: falta conectar la base de datos.\n\n" +
        "Hay que agregar Upstash Redis (gratis) desde Vercel → Storage. Está explicado en AGENTE.md."
    );
    return;
  }

  await responder(
    sesion,
    textoDelPlan(
      resultado.texto,
      resultado.acciones,
      sesion.enGrupo ? sesion.quien : undefined
    ),
    [
      { texto: "✅ Confirmar", dato: `ok:${codigo}` },
      { texto: "✖️ Cancelar", dato: `no:${codigo}` },
    ]
  );
}

// ---- Continuación en otra tanda --------------------------------------

function direccionBase(): string | null {
  const propia = process.env.NEXT_PUBLIC_SITE_URL;
  if (propia) return propia.replace(/\/$/, "");
  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return vercel ? `https://${vercel}` : null;
}

// Le pide al servidor que siga pensando en una función nueva. Se espera
// solo a que acepte el encargo (contesta al toque), no a que termine.
async function pedirContinuacion(codigo: string): Promise<boolean> {
  const base = direccionBase();
  const secreto = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!base || !secreto) return false;

  try {
    const res = await fetch(`${base}/api/agent/continuar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agente-secreto": secreto,
      },
      body: JSON.stringify({ codigo }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Cuando no se puede continuar, se cierra con lo que haya. Callar no es
// una opción.
function cerrarComoSea(estado: EstadoAgente): Extract<
  ResultadoAgente,
  { tipo: "respuesta" | "plan" }
> {
  if (estado.acciones.length > 0) {
    return {
      tipo: "plan",
      texto:
        "Me quedé sin tiempo para seguir puliéndolo, así que revisa bien la lista antes de confirmar.",
      acciones: estado.acciones,
      gasto: estado.gasto,
    };
  }
  return {
    tipo: "respuesta",
    texto:
      "Se me hizo largo y no pude seguir pensándolo. Vuelve a mandármelo, o pídemelo en dos partes más simples.",
    gasto: estado.gasto,
  };
}

// Lo gastado por cada modelo EN ESTA TANDA (el estado lleva el acumulado
// de todo el pedido, y al panel solo le toca sumar lo nuevo).
function gastoDeLaTanda(
  ahora: GastoAgente,
  antes: Record<string, { llamadas: number; tokensEntrada: number; tokensSalida: number } | undefined>
): Record<string, { llamadas: number; tokensEntrada: number; tokensSalida: number }> {
  const delta: Record<
    string,
    { llamadas: number; tokensEntrada: number; tokensSalida: number }
  > = {};
  for (const [modelo, v] of Object.entries(ahora.porModelo ?? {})) {
    const a = antes[modelo] ?? {
      llamadas: 0,
      tokensEntrada: 0,
      tokensSalida: 0,
    };
    const d = {
      llamadas: v.llamadas - a.llamadas,
      tokensEntrada: v.tokensEntrada - a.tokensEntrada,
      tokensSalida: v.tokensSalida - a.tokensSalida,
    };
    if (d.llamadas || d.tokensEntrada || d.tokensSalida) delta[modelo] = d;
  }
  return delta;
}

// ---- El ciclo --------------------------------------------------------

export async function atenderSesion(
  sesion: Sesion,
  presupuestoMs: number = PRESUPUESTO_TANDA_MS
): Promise<void> {
  const antes: GastoAgente = { ...sesion.estado.gasto };
  const antesPorModelo: NonNullable<GastoAgente["porModelo"]> = JSON.parse(
    JSON.stringify(sesion.estado.gasto.porModelo ?? {})
  );
  // Un pedido largo se atiende en varias tandas, pero sigue siendo UN
  // mensaje: solo la primera lo cuenta como tal.
  const primeraTanda = sesion.estado.vuelta === 0;

  // Aviso periódico de que sigue vivo. Es un "toque" al mismo mensaje,
  // así que no llena el chat.
  const latido = sesion.avisoId
    ? setInterval(() => {
        void editarMensaje(
          sesion.chatId,
          sesion.avisoId as number,
          textoDeEspera(sesion.estado)
        );
      }, CADA_MS)
    : undefined;

  let resultado: ResultadoAgente | undefined;
  let fallo: unknown;
  try {
    resultado = await ejecutarAgente(sesion.estado, { presupuestoMs });
  } catch (error) {
    fallo = error;
  } finally {
    if (latido) clearInterval(latido);
  }

  // El consumo se anota SIEMPRE, salga bien o mal. Antes esto vivía
  // después del cálculo y un error se lo saltaba: se perdían justo los
  // mensajes que más gastaron, que son los que revientan la cuota, y el
  // panel quedaba marcando casi cero mientras el bot decía que no había
  // más cupo.
  await anotarConsumo({
    llamadas: sesion.estado.gasto.llamadas - antes.llamadas,
    tokensEntrada: sesion.estado.gasto.tokensEntrada - antes.tokensEntrada,
    tokensSalida: sesion.estado.gasto.tokensSalida - antes.tokensSalida,
    mensajeNuevo: primeraTanda,
    porModelo: gastoDeLaTanda(sesion.estado.gasto, antesPorModelo),
  });

  if (fallo) {
    // Que Google nos frene se anota aparte: es la única señal fiable de
    // cómo está la cuota de verdad.
    if (fallo instanceof ErrorAgente && fallo.cuota) {
      await anotarFreno({ ...fallo.cuota, modelo: fallo.modelo });
    }
    throw fallo;
  }
  if (!resultado) return;

  if (resultado.tipo !== "pendiente") {
    await entregar(sesion, resultado);
    return;
  }

  // Sigue pensando: se guarda todo y se pide otra tanda.
  const codigo = await guardarSesion(sesion);
  const seguira = codigo ? await pedirContinuacion(codigo) : false;

  if (!seguira) {
    await entregar(sesion, cerrarComoSea(sesion.estado));
    return;
  }

  // Deja el aviso al día para que no parezca detenido mientras arranca
  // la tanda siguiente.
  if (sesion.avisoId) {
    await editarMensaje(
      sesion.chatId,
      sesion.avisoId,
      textoDeEspera(sesion.estado)
    );
  }
}
