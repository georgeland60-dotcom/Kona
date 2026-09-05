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

import { agotadosHoy, marcarAgotado, marcarEnUso } from "@/lib/agent/modelos";
import { anotarFreno } from "@/lib/consumo-data";

// La dirección de la API. Se puede apuntar a otro sitio (un proxy, o un
// servidor de mentira para probar sin gastar cuota) sin tocar código.
const BASE =
  process.env.GEMINI_BASE_URL ||
  "https://generativelanguage.googleapis.com/v1beta/models";

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
  modelo: string; // con cuál se respondió (puede cambiar solo si uno se agota)
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
    // Lo que el modelo gastó pensando. Va aparte de la respuesta, pero se
    // paga igual, así que para medir el consumo hay que sumarlo.
    thoughtsTokenCount?: number;
    totalTokenCount?: number;
  };
};

export class ErrorAgente extends Error {
  // true = no falló nada, simplemente se acabó el tiempo. Quien llama
  // decide si aun así puede dar una respuesta útil con lo que ya tiene.
  tiempoAgotado: boolean;
  // Cuando Google nos frena por límite de uso, para poder anotarlo y que
  // se vea en el panel (nuestro contador solo sabe lo que pedimos
  // nosotros; el cupo lo lleva Google por su lado).
  cuota?: { porDia: boolean; detalle: string };
  // Con qué modelo se estaba hablando, para poder contar el intento
  // fallido en la columna correcta del panel.
  modelo?: string;
  constructor(mensaje: string, tiempoAgotado = false) {
    super(mensaje);
    this.tiempoAgotado = tiempoAgotado;
  }
}

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

// ---- Cuota agotada (429) --------------------------------------------
//
//  Google devuelve 429 por dos motivos MUY distintos y hay que
//  distinguirlos, porque la salida es distinta:
//   - por minuto: son unas pocas peticiones seguidas. Se espera y ya.
//   - por día: hasta mañana no hay nada que hacer.
//  El cuerpo del error trae el dato exacto y cuánto conviene esperar.

type Cuota = {
  porDia: boolean;
  esperaMs: number;
  detalle: string;
};

function leerCuota(cuerpo: string): Cuota {
  let porDia = false;
  let esperaMs = 0;
  let detalle = "";

  try {
    const j = JSON.parse(cuerpo) as {
      error?: {
        message?: string;
        details?: Array<{
          "@type"?: string;
          retryDelay?: string;
          violations?: Array<{ quotaId?: string; quotaMetric?: string }>;
        }>;
      };
    };
    detalle = (j.error?.message ?? "").slice(0, 200);

    for (const d of j.error?.details ?? []) {
      if (d.retryDelay) {
        const segundos = Number(String(d.retryDelay).replace(/[^0-9.]/g, ""));
        if (Number.isFinite(segundos)) esperaMs = Math.round(segundos * 1000);
      }
      for (const v of d.violations ?? []) {
        const texto = `${v.quotaId ?? ""} ${v.quotaMetric ?? ""}`;
        if (/perday|per_day|daily/i.test(texto)) porDia = true;
      }
    }
    if (/per day|daily limit/i.test(detalle)) porDia = true;
  } catch {
    detalle = cuerpo.slice(0, 200);
  }

  return { porDia, esperaMs, detalle };
}

function dormir(ms: number): Promise<void> {
  return new Promise((listo) => setTimeout(listo, ms));
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
      // Los Gemini 3 "piensan" antes de responder y ese pensamiento gasta
      // del mismo presupuesto que la respuesta. Con poco margen se quedan
      // sin espacio y devuelven un turno vacío, así que se les da aire:
      // el tiempo ya no es problema (el agente puede seguir en otra tanda).
      maxOutputTokens: 8192,
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
  // Cuánto se puede esperar como máximo. Sin esto, una respuesta lenta se
  // come el tiempo de la función entera y la dueña no recibe NADA: ni la
  // respuesta ni un aviso. Mejor cortar a tiempo y avisar.
  limiteMs?: number;
}): Promise<RespuestaModelo> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ErrorAgente(
      "Falta la clave GEMINI_API_KEY. Sácala gratis en aistudio.google.com/apikey y ponla en las variables de entorno."
    );
  }

  const cuerpo = cuerpoPeticion(opciones);

  // Todo lo que sigue (esperas de cuota incluidas) tiene que caber aquí.
  const fin = Date.now() + (opciones.limiteMs ?? 10 * 60 * 1000);

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
        signal: AbortSignal.timeout(Math.max(1_000, fin - Date.now())),
      });
    } catch (e) {
      if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
        throw new ErrorAgente("La IA se está demorando más de la cuenta.", true);
      }
      throw new ErrorAgente(
        "No pude conectarme con la IA. Intenta de nuevo en un momento."
      );
    }
  }

  // ---- Con qué modelo hablar ----------------------------------------
  //
  //  La capa gratuita es POR MODELO. Si el de siempre se quedó sin cupo,
  //  no hay razón para dejar de trabajar: se pasa al siguiente que la
  //  clave acepte. Los que ya se sabe agotados hoy ni se intentan, para
  //  no gastar un viaje en chocar con la misma pared.
  const sinCupo = await agotadosHoy();
  const cola: string[] = [];
  const sumar = (m?: string | null) => {
    if (m && !cola.includes(m) && !sinCupo.has(m)) cola.push(m);
  };
  sumar(modeloConfirmado);
  sumar(MODELO_PREFERIDO);
  if (cola.length === 0) {
    // Los de siempre están agotados: hay que ver qué más acepta la clave.
    for (const m of ordenarModelos(await listarModelos(apiKey))) sumar(m);
  }
  if (cola.length === 0) {
    const error = new ErrorAgente(
      "Se acabó el cupo gratis de hoy en todos los modelos de IA disponibles. " +
        "Se renueva solo de madrugada."
    );
    error.cuota = { porDia: true, detalle: "sin modelos con cupo" };
    throw error;
  }

  let modelo = cola[0];
  let res: Response | null = null;
  let detalle = "";

  for (let i = 0; i < cola.length && i < 6; i++) {
    modelo = cola[i];
    res = await pedir(modelo);

    // Límite POR MINUTO: no es falta de cupo, son muchas peticiones
    // seguidas. Se espera lo que pide Google y se reintenta igual.
    for (let intento = 0; res.status === 429 && intento < 3; intento++) {
      const cuota = leerCuota(await res.clone().text().catch(() => ""));
      if (cuota.porDia) break;
      const espera = Math.min(Math.max(cuota.esperaMs || 8_000, 3_000), 60_000);
      if (espera + 10_000 > fin - Date.now()) break; // no cabe en esta tanda
      await dormir(espera);
      res = await pedir(modelo);
    }

    if (res.ok) break;
    detalle = await res.clone().text().catch(() => "");

    if (res.status === 429) {
      const cuota = leerCuota(detalle);
      if (cuota.porDia) {
        // Sin cupo hasta mañana: queda anotado (para el panel y para no
        // volver a intentarlo) y se sigue con el siguiente modelo.
        await marcarAgotado(modelo, cuota.detalle);
        // Queda registrado en el consumo del día aunque el pedido siga
        // adelante con otro modelo: si no, el panel no mostraría nada y
        // el corte sería invisible, que es justo lo que confunde.
        await anotarFreno({ porDia: true, detalle: cuota.detalle, modelo });
        sinCupo.add(modelo);
        if (modeloConfirmado === modelo) modeloConfirmado = null;
      }
      // Aunque sea el límite por minuto, otro modelo tiene su propio
      // contador: probarlo es mejor que hacer esperar a la dueña.
      if (i + 1 >= cola.length) {
        for (const m of ordenarModelos(await listarModelos(apiKey))) sumar(m);
      }
      continue;
    }

    // 404 no significa "escribiste mal el nombre": Google retira modelos
    // y deja de servirlos a las claves nuevas, aunque sigan apareciendo
    // en la lista. Hay que probar candidatos hasta dar con uno que sirva.
    if (res.status === 404) {
      sumar(modeloSugeridoPorGoogle(detalle));
      for (const m of ordenarModelos(await listarModelos(apiKey))) sumar(m);
      continue;
    }

    break; // el resto de errores no se arreglan cambiando de modelo
  }

  if (!res) {
    throw new ErrorAgente("No pude hablar con la IA. Intenta de nuevo.");
  }

  if (res.ok) {
    // Nos quedamos con el que funcionó para los siguientes mensajes, y
    // queda anotado para que el panel muestre cuál está trabajando.
    modeloConfirmado = modelo;
    await marcarEnUso(modelo);
  }

  if (!res.ok) {
    if (!detalle) detalle = await res.text().catch(() => "");
    if (res.status === 429) {
      // Decir CUÁL límite se topó: no es lo mismo esperar un minuto que
      // esperar a mañana, y el mensaje de antes no lo distinguía.
      const cuota = leerCuota(detalle);
      const error = new ErrorAgente(
        cuota.porDia
          ? `Se acabó la cuota GRATIS DEL DÍA de la IA (límite de Google para el modelo "${modelo}"). ` +
            "Se renueva sola de madrugada. Google dijo: " +
            (cuota.detalle || "sin detalle")
          : "La IA está recibiendo muchas peticiones seguidas y me frenó por unos minutos " +
            "(es el límite POR MINUTO de la capa gratuita, no se acabó la cuota del día). " +
            "Espera un par de minutos y vuelve a pedírmelo. Google dijo: " +
            (cuota.detalle || "sin detalle")
      );
      error.cuota = { porDia: cuota.porDia, detalle: cuota.detalle };
      error.modelo = modelo;
      throw error;
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
    const error = new ErrorAgente(
      `La IA rechazó la petición (${res.status})${razon ? `: ${razon}` : "."}`
    );
    error.modelo = modelo;
    throw error;
  }

  const data = (await res.json()) as GeminiRespuesta;

  if (data.error?.message) throw new ErrorAgente(`IA: ${data.error.message}`);
  if (data.promptFeedback?.blockReason) {
    throw new ErrorAgente("La IA bloqueó el mensaje. Reformúlalo, por favor.");
  }

  const candidato = data.candidates?.[0];
  const partes = candidato?.content?.parts ?? [];

  // Se quedó sin espacio para responder (normalmente porque "pensó" de
  // más). Decirlo es mejor que devolver un turno vacío, que aguas abajo
  // se convertiría en un "Listo." que no significa nada.
  if (partes.length === 0 && candidato?.finishReason === "MAX_TOKENS") {
    throw new ErrorAgente(
      "Me enredé pensando y me quedé sin espacio para responder. ¿Me lo pides más simple o en dos partes?"
    );
  }
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
    modelo,
    texto: texto.trim(),
    llamadas,
    partesCrudas: partes as unknown as Parte[],
    consumo: {
      entrada: data.usageMetadata?.promptTokenCount ?? 0,
      salida:
        (data.usageMetadata?.candidatesTokenCount ?? 0) +
        (data.usageMetadata?.thoughtsTokenCount ?? 0),
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
