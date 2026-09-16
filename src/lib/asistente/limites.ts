// =============================================================
//  LÍMITES DEL ASISTENTE DE LA TIENDA
//
//  El asistente de la dueña habla con dos personas. Este habla con
//  cualquiera que entre a la web, y la cuota de IA es la misma bolsa.
//  Sin frenos, una tarde con mucha gente (o una sola persona aburrida
//  dándole al teclado) deja a la dueña sin poder cambiar un precio.
//
//  Por eso hay dos frenos, y los dos fallan del lado amable: cuando se
//  llega al tope no se rompe nada, se responde que ahora mismo no se
//  puede atender y se ofrece WhatsApp, que es donde de verdad se cierra
//  una venta.
// =============================================================

import { contar } from "@/lib/kv";
import { hoyEnLima } from "@/lib/fechas";

// Cuántos mensajes puede mandar una misma persona en diez minutos. Da
// para una conversación larga de compra y corta el abuso.
const POR_PERSONA = Number(process.env.ASISTENTE_LIMITE_PERSONA || 15);
const VENTANA_SEGUNDOS = 10 * 60;

// Cuántas consultas al día puede gastar el asistente en total. Es el
// freno que protege el trabajo de la dueña.
const POR_DIA = Number(process.env.ASISTENTE_LIMITE_DIA || 300);

export type Veredicto =
  | { ok: true }
  | { ok: false; motivo: "persona" | "dia"; mensaje: string };

export async function permitirConsulta(
  huella: string
): Promise<Veredicto> {
  const delDia = await contar(`asistente-dia-${hoyEnLima()}`, 26 * 60 * 60);
  if (delDia > POR_DIA) {
    return {
      ok: false,
      motivo: "dia",
      mensaje:
        "Por hoy ya no puedo seguir atendiendo por aquí 🙏 Escríbenos por WhatsApp y te ayudamos igual.",
    };
  }

  const dePersona = await contar(
    `asistente-persona-${huella}`,
    VENTANA_SEGUNDOS
  );
  if (dePersona > POR_PERSONA) {
    return {
      ok: false,
      motivo: "persona",
      mensaje:
        "Llevamos muchas preguntas seguidas 😅 Dame unos minutos, o escríbenos por WhatsApp y te atendemos al toque.",
    };
  }

  return { ok: true };
}

// De quién viene la consulta, sin guardar datos de nadie: basta con
// poder distinguir una visita de otra para contar.
export function huellaDe(req: Request): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "desconocida";
  return ip.replace(/[^a-zA-Z0-9.:_-]/g, "").slice(0, 45) || "desconocida";
}
