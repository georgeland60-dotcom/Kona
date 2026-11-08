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
  ordenarModelos,
} from "@/lib/agent/gemini";
import { isPersistent } from "@/lib/kv";
import { preguntarAlModelo, proveedorDeIa } from "@/lib/agent/ia";
import { cuotaDeOpenRouter, modelosCandidatos } from "@/lib/agent/openrouter";

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
  // La clave que hace falta depende de con quién hable la IA. Pedir la
  // de Google cuando la tienda usa OpenRouter dejaba el bot sin conectar
  // por una variable que ya no se usa.
  const proveedor = proveedorDeIa();
  const claveDeIa =
    proveedor === "openrouter" ? "OPENROUTER_API_KEY" : "GEMINI_API_KEY";
  const faltantes = ["TELEGRAM_BOT_TOKEN", claveDeIa].filter(
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
    if (proveedor === "openrouter") {
      const [conHerramientas, soloTexto, cuota] = await Promise.all([
        modelosCandidatos({ herramientas: true, imagenes: false }),
        modelosCandidatos({ herramientas: false, imagenes: false }),
        cuotaDeOpenRouter(),
      ]);
      return Response.json({
        proveedor,
        cuotaDelDia: cuota,
        paraElBot: conHerramientas.slice(0, 6),
        paraElAsistente: soloTexto.slice(0, 6),
        nota: "Son los modelos gratis que OpenRouter ofrece hoy, ya ordenados. El bot necesita los que aceptan herramientas. Para fijar uno a mano, ponlo en OPENROUTER_MODELOS.",
      });
    }
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
    // Con OpenRouter la prueba es la de verdad: una pregunta corta por
    // la misma puerta que usa la tienda. Es lo que de verdad dice si
    // está bien conectado.
    if (proveedor === "openrouter") {
      try {
        const respuesta = await preguntarAlModelo({
          instruccion: "Responde en una sola palabra.",
          mensajes: [{ role: "user", parts: [{ text: "¿Estás ahí?" }] }],
          herramientas: [],
          limiteMs: 25_000,
          maximoSalida: 32,
        });
        return Response.json({
          proveedor,
          ok: true,
          modelo: respuesta.modelo,
          dijo: respuesta.texto,
          consumo: respuesta.consumo,
          cuotaDelDia: await cuotaDeOpenRouter(),
        });
      } catch (error) {
        return Response.json(
          {
            proveedor,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
            cuotaDelDia: await cuotaDeOpenRouter(),
          },
          { status: 502 }
        );
      }
    }

    const apiKey = process.env.GEMINI_API_KEY as string;
    const disponibles = await listarModelos(apiKey);
    const preferido = modeloPreferido();
    // Probamos el preferido y, si hay otro distinto, el siguiente candidato.
    // El siguiente mejor candidato según el mismo criterio que usa el
    // agente (no vale coger cualquiera que diga "flash": los de voz o
    // imagen también lo dicen y no sirven para conversar).
    const otro = ordenarModelos(disponibles).find((m) => m !== preferido);
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
