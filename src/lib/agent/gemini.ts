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

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Modelo preferido. Si no existe para la clave de quien instala (Google
// va renombrando y retirando modelos), lo descubrimos solo: ver
// elegirModeloDisponible() más abajo.
const MODELO_PREFERIDO = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Una vez que sabemos cuál funciona, lo recordamos para no volver a
// preguntar la lista en cada mensaje.
let modeloConfirmado: string | null = null;

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

// ---- Elegir un modelo que la clave sí tenga -------------------------

type ModeloListado = {
  name?: string;
  supportedGenerationMethods?: string[];
};

// Le preguntamos a la API qué modelos puede usar ESTA clave, y elegimos
// el mejor para lo nuestro. Así la instalación no se rompe cuando Google
// renombra o retira un modelo.
export async function listarModelos(apiKey: string): Promise<string[]> {
  const res = await fetch(BASE, {
    headers: { "x-goog-api-key": apiKey },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { models?: ModeloListado[] };
  return (data.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => (m.name ?? "").replace(/^models\//, ""))
    .filter(Boolean);
}

// Puntúa cada modelo según lo que necesitamos: barato, rápido, que
// entienda audio y que acepte herramientas. Los "flash" cumplen todo.
function puntuar(nombre: string): number {
  const n = nombre.toLowerCase();
  // Descartamos los que no sirven para conversar con herramientas.
  if (/embedding|aqa|imagen|veo|tts|image-generation/.test(n)) return -1;
  let p = 0;
  if (n.includes("flash")) p += 100;
  if (n.includes("pro")) p += 40;
  if (n.includes("2.5")) p += 30;
  if (n.includes("2.0")) p += 20;
  if (n.includes("latest")) p += 10;
  // Preferimos versiones estables antes que experimentales o recortadas.
  if (/exp|preview|thinking/.test(n)) p -= 25;
  if (n.includes("lite")) p -= 15;
  return p;
}

async function elegirModeloDisponible(apiKey: string): Promise<string | null> {
  const disponibles = await listarModelos(apiKey);
  const ordenados = disponibles
    .map((nombre) => ({ nombre, punto: puntuar(nombre) }))
    .filter((m) => m.punto >= 0)
    .sort((a, b) => b.punto - a.punto);
  return ordenados[0]?.nombre ?? null;
}

// ---- Llamada al modelo ----------------------------------------------

function cuerpoPeticion(opciones: {
  instruccion: string;
  mensajes: Mensaje[];
  herramientas: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
}): string {
  return JSON.stringify({
    systemInstruction: { parts: [{ text: opciones.instruccion }] },
    contents: opciones.mensajes,
    tools: [{ functionDeclarations: opciones.herramientas }],
    toolConfig: { functionCallingConfig: { mode: "AUTO" } },
    generationConfig: {
      // Temperatura baja: queremos precisión con precios, no creatividad.
      temperature: 0.1,
      maxOutputTokens: 2048,
    },
  });
}

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

  const cuerpo = cuerpoPeticion(opciones);

  async function pedir(modelo: string): Promise<Response> {
    try {
      return await fetch(`${BASE}/${modelo}:generateContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey as string,
        },
        cache: "no-store",
        body: cuerpo,
      });
    } catch {
      throw new ErrorAgente(
        "No pude conectarme con la IA. Intenta de nuevo en un momento."
      );
    }
  }

  let modelo = modeloConfirmado ?? MODELO_PREFERIDO;
  let res = await pedir(modelo);

  // 404 = ese modelo no existe para esta clave. Google renombra y retira
  // modelos cada cierto tiempo, así que en vez de fallar preguntamos cuáles
  // hay disponibles y reintentamos con el mejor.
  if (res.status === 404 && !modeloConfirmado) {
    const alternativo = await elegirModeloDisponible(apiKey);
    if (alternativo && alternativo !== modelo) {
      modelo = alternativo;
      res = await pedir(modelo);
    }
    if (!res.ok) {
      const disponibles = await listarModelos(apiKey);
      throw new ErrorAgente(
        disponibles.length > 0
          ? `El modelo "${MODELO_PREFERIDO}" no está disponible para tu clave. Pon una de estas en la variable GEMINI_MODEL: ${disponibles.slice(0, 6).join(", ")}.`
          : `El modelo "${MODELO_PREFERIDO}" no existe para tu clave, y tampoco pude leer la lista de modelos disponibles. Revisa que GEMINI_API_KEY sea correcta.`
      );
    }
  }

  if (res.ok && modelo !== modeloConfirmado) {
    // Nos quedamos con el que funcionó para los siguientes mensajes.
    modeloConfirmado = modelo;
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
    if (res.status === 403) {
      throw new ErrorAgente(
        "Google rechazó la clave GEMINI_API_KEY (sin permiso). Genera una nueva en aistudio.google.com/apikey."
      );
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
