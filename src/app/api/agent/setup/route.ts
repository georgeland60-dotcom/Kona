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
import {
  listarModelos,
  probarModelo,
  modeloPreferido,
} from "@/lib/agent/gemini";
import { isPersistent } from "@/lib/kv";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secreto = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!secreto || url.searchParams.get("clave") !== secreto) {
    return Response.json({ error: "clave incorrecta" }, { status: 401 });
  }

  // Solo exigimos lo que hace falta para CONECTAR el bot. Ojo:
  // TELEGRAM_ALLOWED_CHAT_IDS no se pide aquí a propósito. El número del
  // chat solo se puede averiguar escribiéndole /start al bot, y para eso
  // el webhook tiene que estar conectado antes. Pedirla aquí sería un
  // círculo vicioso: no podrías conectar sin el número, ni obtener el
  // número sin conectar.
  const faltantes = ["TELEGRAM_BOT_TOKEN", "GEMINI_API_KEY"].filter(
    (v) => !process.env[v]
  );

  if (faltantes.length > 0) {
    return Response.json(
      {
        ok: false,
        error: `Faltan variables de entorno: ${faltantes.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const hayAutorizados = !!process.env.TELEGRAM_ALLOWED_CHAT_IDS?.trim();

  // Diagnóstico: ?modelos=1 lista los modelos de IA que acepta ESTA clave.
  // Sirve cuando la IA responde 404 (Google renombra y retira modelos), para
  // saber cuál poner en GEMINI_MODEL sin adivinar.
  if (url.searchParams.get("modelos")) {
    const modelos = await listarModelos(process.env.GEMINI_API_KEY as string);
    return Response.json({
      modelos,
      nota:
        modelos.length > 0
          ? "Estos son los modelos que tu clave puede usar. El agente elige el mejor solo; si quieres fijar uno, ponlo en la variable GEMINI_MODEL."
          : "No pude leer la lista. Revisa que GEMINI_API_KEY sea correcta.",
    });
  }

  // Diagnóstico: ?probar=1 hace la llamada más simple posible a la IA y
  // devuelve lo que respondió Google, sin interpretarlo. Es la forma de
  // ver el motivo real de un fallo en vez de deducirlo del código HTTP.
  if (url.searchParams.get("probar")) {
    const apiKey = process.env.GEMINI_API_KEY as string;
    const disponibles = await listarModelos(apiKey);
    const preferido = modeloPreferido();
    // Probamos el preferido y, si hay otro distinto, el siguiente candidato.
    const otro = disponibles.find((m) => m !== preferido && m.includes("flash"));
    const pruebas = [await probarModelo(apiKey, preferido)];
    if (otro) pruebas.push(await probarModelo(apiKey, otro));
    return Response.json({
      preferido,
      figura_en_la_lista: disponibles.includes(preferido),
      total_modelos: disponibles.length,
      pruebas,
    });
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
    hay_autorizados: hayAutorizados,
    aviso: isPersistent()
      ? undefined
      : "No hay base de datos KV configurada: los cambios que haga el agente no se guardarán. Revisa AGENTE.md.",
    siguiente: !listo
      ? "No se pudo conectar. Revisa que TELEGRAM_BOT_TOKEN sea correcto."
      : hayAutorizados
        ? "Listo. Escríbele /start a tu bot en Telegram."
        : "Conectado. Ahora escribe /start en tu chat o grupo: el bot te dirá que no estás autorizado y te dará el número que hay que poner en TELEGRAM_ALLOWED_CHAT_IDS.",
  });
}
