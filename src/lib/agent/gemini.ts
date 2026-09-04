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
// va renombrando y retirando modelos), se descubre solo probando
// candidatos: ver el bloque de 404 en preguntarAlModelo().
const MODELO_PREFERIDO = process.env.GEMINI_MODEL || "gemini-3.6-flash";

// Una vez que sabemos cuál funciona, lo recordamos para no volver a
// preguntar la lista en cada mensaje.
let modeloConfirmado: string | null = null;

// ---- Forma de los mensajes que se le mandan al modelo ---------------

// Los modelos Gemini 3 devuelven una "firma de razonamiento" pegada a cada
// llamada a herramienta, y exigen que se les devuelva tal cual en el turno
// siguiente. Por eso viaja aquí, aunque nosotros nunca la leamos.
export type Parte =
  | { text: string; thoughtSignature?: string }
  | { inlineData: { mimeType: string; data: string } }
  | {
      functionCall: { name: string; args: Record<string, unknown> };
      thoughtSignature?: string;
    }
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

// Lo que Google dice que costó la llamada. Viene en la respuesta, así que
// no hay que estimar nada: es el dato real.
export type Consumo = { entrada: number; salida: number };

export type RespuestaModelo = {
  texto: string;
  llamadas: LlamadaHerramienta[];
  consumo: Consumo;
  // El turno del modelo TAL CUAL vino. Hay que reenviarlo sin tocar: si se
  // reconstruye a mano se pierden campos que la API exige de vuelta (la
  // firma de razonamiento, sin ir más lejos) y rechaza la conversación.
  partesCrudas: Parte[];
};

type GeminiParte = {
  text?: string;
  functionCall?: { name?: string; args?: Record<string, unknown> };
  thoughtSignature?: string;
};

type GeminiRespuesta = {
  candidates?: Array<{
    content?: { parts?: GeminiParte[] };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

export class ErrorAgente extends Error {}

// Extrae el texto legible del error que devuelve Google, que viene
// envuelto en JSON. Si no se puede leer, devuelve cadena vacía.
function mensajeDeGoogle(cuerpo: string): string {
  try {
    const j = JSON.parse(cuerpo) as { error?: { message?: string } };
    return (j.error?.message ?? "").slice(0, 300);
  } catch {
    return cuerpo.slice(0, 200);
  }
}

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

// Puntúa cada modelo según lo que necesitamos: rápido, barato, que
// entienda audio y acepte herramientas. Los "flash" cumplen todo.
//
// La versión se lee como número (3.6 > 2.5) en vez de listar versiones a
// mano: así, cuando Google saque la siguiente, gana sola sin tocar código.
function puntuar(nombre: string): number {
  const n = nombre.toLowerCase();
  // Fuera los que no sirven para conversar con herramientas.
  if (/embedding|aqa|imagen|veo|tts|image-generation|gemma|learnlm|live|native-audio/.test(n)) {
    return -1;
  }
  let p = 0;
  const version = n.match(/(\d+)\.(\d+)/);
  if (version) {
    p += (parseInt(version[1], 10) * 10 + parseInt(version[2], 10)) * 4;
  }
  if (n.includes("flash")) p += 100;
  if (n.includes("pro")) p += 40;
  if (n.includes("latest")) p += 8;
  // Preferimos estables antes que experimentales o recortados.
  if (/exp|preview|thinking/.test(n)) p -= 25;
  if (n.includes("lite")) p -= 15;
  return p;
}

// Cuando Google retira un modelo, el error nombra el reemplazo ("Please
// update your code to use models/gemini-3.6-flash"). Hacerle caso es más
// fiable que cualquier lista: es la propia API diciendo qué usar.
//
// Ojo: el mensaje menciona DOS modelos, y el primero es el que acaba de
// fallar ("This model models/X is no longer available... use models/Y").
// Quedarse con el primero sería reintentar con el modelo muerto.
function modeloSugeridoPorGoogle(cuerpo: string): string | null {
  const limpiar = (m: string) =>
    m.replace(/^models\//i, "").replace(/[.,;:]+$/, "");

  const recomendado = cuerpo.match(/use\s+models\/[a-z0-9.\-]+/i);
  if (recomendado) return limpiar(recomendado[0].replace(/^use\s+/i, ""));

  // Sin esa frase, el último mencionado suele ser el reemplazo.
  const todos = cuerpo.match(/models\/[a-z0-9.\-]+/gi);
  return todos && todos.length > 1 ? limpiar(todos[todos.length - 1]) : null;
}

// Modelos ordenados de mejor a peor para nuestro caso.
export function ordenarModelos(nombres: string[]): string[] {
  return nombres
    .map((nombre) => ({ nombre, punto: puntuar(nombre) }))
    .filter((m) => m.punto >= 0)
    .sort((a, b) => b.punto - a.punto)
    .map((m) => m.nombre);
}

// ---- Llamada al modelo ----------------------------------------------

function cuerpoPeticion(opciones: {
  instruccion: string;
  mensajes: Mensaje[];
  herramientas: Array<{
    name: string;
    description: string;
    parameters?: Record<string, unknown>;
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
    parameters?: Record<string, unknown>;
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

  // 404 aquí no significa "escribiste mal el nombre": Google retira modelos
  // y deja de servirlos a las claves nuevas, aunque sigan apareciendo en la
  // lista de modelos. Por eso no basta con consultar la lista; hay que
  // probar candidatos hasta dar con uno que responda.
  if (res.status === 404 && !modeloConfirmado) {
    const cuerpo404 = await res.clone().text().catch(() => "");

    // 1º el reemplazo que la propia Google sugiere en el mensaje de error.
    const candidatos: string[] = [];
    const sugerido = modeloSugeridoPorGoogle(cuerpo404);
    if (sugerido && sugerido !== modelo) candidatos.push(sugerido);

    // 2º los de la lista, del mejor al peor.
    for (const m of ordenarModelos(await listarModelos(apiKey))) {
      if (m !== modelo && !candidatos.includes(m)) candidatos.push(m);
    }

    // Probamos unos pocos: si los primeros fallan, el problema es otro.
    for (const candidato of candidatos.slice(0, 4)) {
      const intento = await pedir(candidato);
      if (intento.ok) {
        modelo = candidato;
        res = intento;
        break;
      }
      res = intento;
    }

    if (!res.ok) {
      const razon = mensajeDeGoogle(cuerpo404);
      throw new ErrorAgente(
        `Ningún modelo de IA aceptó la petición. Google dijo sobre "${MODELO_PREFERIDO}": ${razon || "sin detalle"}. ` +
          "Abre /api/agent/setup?clave=…&probar=1 para ver el detalle completo."
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
    // Siempre el motivo real. Un código HTTP suelto no dice nada y obliga a
    // adivinar; el texto de Google suele señalar el problema exacto.
    const razon = mensajeDeGoogle(detalle);
    throw new ErrorAgente(
      `La IA rechazó la petición (${res.status})${razon ? `: ${razon}` : "."}`
    );
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

  return {
    texto: texto.trim(),
    llamadas,
    partesCrudas: partes as unknown as Parte[],
    consumo: {
      entrada: data.usageMetadata?.promptTokenCount ?? 0,
      salida: data.usageMetadata?.candidatesTokenCount ?? 0,
    },
  };
}


// ---- Diagnóstico ----------------------------------------------------

// Hace la llamada más simple posible a un modelo y devuelve tal cual lo
// que respondió Google. Sirve para ver el motivo real de un fallo en vez
// de adivinar a partir del código HTTP.
export async function probarModelo(
  apiKey: string,
  modelo: string
): Promise<{ modelo: string; estado: number; respuesta: string }> {
  try {
    const res = await fetch(`${BASE}/${modelo}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      cache: "no-store",
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "hola" }] }],
      }),
    });
    const texto = await res.text();
    return { modelo, estado: res.status, respuesta: texto.slice(0, 500) };
  } catch (e) {
    return {
      modelo,
      estado: 0,
      respuesta: e instanceof Error ? e.message : "fallo de red",
    };
  }
}

export function modeloPreferido(): string {
  return MODELO_PREFERIDO;
}
