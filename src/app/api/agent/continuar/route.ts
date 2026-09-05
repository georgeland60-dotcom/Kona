// =============================================================
//  CONTINUAR UN PEDIDO QUE SE QUEDÓ A MEDIO PENSAR
//
//  El agente se llama a sí mismo aquí cuando necesita más tiempo del que
//  dura una función. Retoma la conversación exactamente donde estaba y
//  sigue en el mismo mensaje de Telegram.
//
//  No es un endpoint público: solo se acepta con el secreto interno, el
//  mismo que ya usa el webhook de Telegram.
// =============================================================

import { after } from "next/server";
import { atenderSesion } from "@/lib/agent/conversacion";
import { tomarSesion } from "@/lib/agent/sesion";
import { ErrorAgente } from "@/lib/agent/gemini";
import { enviarMensaje, escapar } from "@/lib/agent/telegram";

export const maxDuration = 300;

export async function POST(req: Request) {
  const secreto = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secreto || req.headers.get("x-agente-secreto") !== secreto) {
    return new Response("no autorizado", { status: 401 });
  }

  let codigo = "";
  try {
    codigo = String(((await req.json()) as { codigo?: string }).codigo || "");
  } catch {
    return Response.json({ ok: true });
  }
  if (!codigo) return Response.json({ ok: true });

  // Se contesta al toque (quien llama solo quiere saber que el encargo
  // fue aceptado) y se sigue pensando después de contestar.
  after(async () => {
    const sesion = await tomarSesion(codigo);
    if (!sesion) return;
    try {
      await atenderSesion(sesion);
    } catch (error) {
      const detalle =
        error instanceof ErrorAgente
          ? error.message
          : "Se me cruzaron los cables mientras lo pensaba. Intenta de nuevo, por favor.";
      await enviarMensaje(sesion.chatId, `⚠️ ${escapar(detalle)}`);
    }
  });

  return Response.json({ ok: true });
}
