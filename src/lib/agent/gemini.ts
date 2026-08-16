// =============================================================
//  CEREBRO DEL AGENTE (Google Gemini)
//
//  ¿Por qué Gemini? Porque su plan gratuito alcanza de sobra para una
//  tienda (decenas de mensajes al día sin pagar) y porque entiende el
//  AUDIO directamente: la nota de voz de Telegram se le manda tal cual,
//  sin necesidad de contratar un servicio de transcripción aparte.
//
//  Aquí solo hablamos con la API. Las reglas de negocio están en
//  prompt.ts y las acciones permitidas en tools.ts.
// =============================================================

const MODELO = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// ---- Forma de los mensajes que se le mandan al modelo ---------------

export type Parte =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | {
      functionResponse: {
        name: string;
        response: Record<string, unknown>;
      };
    };

export type Mensaje = { role: "user" | "model"; parts: Parte[] };

export type LlamadaHerramienta = {
  nombre: string;
  args: Record<string, unknown>;
};

export type RespuestaModelo = {
  texto: string;
  llamadas: LlamadaHerramienta[];
};

type GeminiParte = {
  text?: string;
  functionCall?: { name?: string; args?: Record<string, unknown> };
};

type GeminiRespuesta = {
  candidates?: Array<{
    content?: { parts?: GeminiParte[] };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
};

export class ErrorAgente extends Error {}

// ---- Llamada al modelo ----------------------------------------------

export async function preguntarAlModelo(opciones: {
  instruccion: string; // el "system prompt": quién es y qué puede hacer
  mensajes: Mensaje[];
  herramientas: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
}): Promise<RespuestaModelo> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ErrorAgente(
      "Falta la clave GEMINI_API_KEY. Sácala gratis en aistudio.google.com/apikey y ponla en las variables de entorno."
    );
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}/${MODELO}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      cache: "no-store",
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opciones.instruccion }] },
        contents: opciones.mensajes,
        tools: [{ functionDeclarations: opciones.herramientas }],
        toolConfig: { functionCallingConfig: { mode: "AUTO" } },
        generationConfig: {
          // Temperatura baja: queremos precisión con precios, no creatividad.
          temperature: 0.1,
          maxOutputTokens: 2048,
        },
      }),
    });
  } catch {
    throw new ErrorAgente("No pude conectarme con la IA. Intenta de nuevo en un momento.");
  }

  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    if (res.status === 429) {
      throw new ErrorAgente(
        "Se acabó la cuota gratuita de la IA por ahora. Espera unos minutos y vuelve a intentar."
      );
    }
    if (res.status === 400 && detalle.includes("API key")) {
      throw new ErrorAgente("La clave GEMINI_API_KEY no es válida.");
    }
    throw new ErrorAgente(`La IA respondió con un error (${res.status}).`);
  }

  const data = (await res.json()) as GeminiRespuesta;

  if (data.error?.message) throw new ErrorAgente(`IA: ${data.error.message}`);
  if (data.promptFeedback?.blockReason) {
    throw new ErrorAgente("La IA bloqueó el mensaje. Reformúlalo, por favor.");
  }

  const partes = data.candidates?.[0]?.content?.parts ?? [];
  const llamadas: LlamadaHerramienta[] = [];
  let texto = "";

  for (const parte of partes) {
    if (parte.functionCall?.name) {
      llamadas.push({
        nombre: parte.functionCall.name,
        args: parte.functionCall.args ?? {},
      });
    } else if (typeof parte.text === "string") {
      texto += parte.text;
    }
  }

  return { texto: texto.trim(), llamadas };
}
