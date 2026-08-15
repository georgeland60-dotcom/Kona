// =============================================================
//  CONECTAR EL BOT (se usa una sola vez)
//
//  Telegram necesita saber a qué dirección avisarle. En vez de pelear
//  con la terminal, basta con abrir en el navegador:
//
//    https://TU-TIENDA.vercel.app/api/agent/setup?clave=EL_SECRETO
//
//  donde EL_SECRETO es el valor de TELEGRAM_WEBHOOK_SECRET.
// =============================================================

import { registrarWebhook } from "@/lib/agent/telegram";
import { isPersistent } from "@/lib/kv";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secreto = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!secreto || url.searchParams.get("clave") !== secreto) {
    return Response.json({ error: "clave incorrecta" }, { status: 401 });
  }

  const faltantes = [
    "TELEGRAM_BOT_TOKEN",
    "GEMINI_API_KEY",
    "TELEGRAM_ALLOWED_CHAT_IDS",
  ].filter((v) => !process.env[v]);

  if (faltantes.length > 0) {
    return Response.json(
      {
        ok: false,
        error: `Faltan variables de entorno: ${faltantes.join(", ")}`,
      },
      { status: 400 }
    );
  }

  // La dirección pública a la que Telegram debe avisar.
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL || url.origin
  ).replace(/\/+$/, "");
  const destino = `${base}/api/agent/telegram`;

  const listo = await registrarWebhook(destino, secreto);

  return Response.json({
    ok: listo,
    webhook: destino,
    guardado_permanente: isPersistent(),
    aviso: isPersistent()
      ? undefined
      : "No hay base de datos KV configurada: los cambios que haga el agente no se guardarán. Revisa AGENTE.md.",
    siguiente: listo
      ? "Listo. Escríbele /start a tu bot en Telegram."
      : "No se pudo conectar. Revisa que TELEGRAM_BOT_TOKEN sea correcto.",
  });
}
