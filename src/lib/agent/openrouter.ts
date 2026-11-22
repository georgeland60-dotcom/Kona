// =============================================================
//  LA IA, A TRAVÉS DE OPENROUTER
//
//  Un solo contrato y muchos modelos detrás: si el de Google está
//  saturado, la misma llamada sale por otro sin cambiar nada más. Es la
//  razón de traerlo: hablando con Google directo, una tarde mala deja
//  al asistente y al bot mudos, y eso se ve en la tienda.
//
//  Lo que NO cambia al pasar por aquí: la conversación se sigue
//  guardando con la forma de siempre (role model/user y partes con
//  functionCall / functionResponse). Este archivo traduce a la ida y a
//  la vuelta. Así el bot, su memoria guardada y las herramientas no se
//  enteran de que cambió el proveedor.
//
//  Dos reglas que vienen de la guía y conviene no perder:
//   - Los modelos gratis se saturan a ratos. Hay que tener una cadena de
//     varios y pasar al siguiente en cuanto uno falla.
//   - La lista de modelos gratis CAMBIA: OpenRouter los retira sin
//     avisar. Por eso no hay nombres escritos a mano aquí dentro: se
//     piden a la API y se guardan un día.
// =============================================================

import { readDoc, writeDoc } from "@/lib/kv";
import { agotadosHoy, marcarAgotado, marcarEnUso } from "@/lib/agent/modelos";
import { anotarFreno } from "@/lib/consumo-data";
import { urlDelSitio } from "@/lib/sitio";
import { store } from "@/config/store";
import {
  ErrorAgente,
  type Mensaje,
  type Parte,
  type RespuestaModelo,
} from "@/lib/agent/gemini";

const BASE = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";

// Cuánto se espera a UN modelo antes de probar el siguiente. Un modelo
// lento es peor que uno que falla rápido: mientras espera, la clienta
// mira una pantalla quieta.
const LIMITE_POR_INTENTO_MS = Number(process.env.OPENROUTER_TIMEOUT_MS) || 15_000;

// Cuántos modelos se prueban antes de rendirse (y pasar a Gemini). Los
// gratis se saturan a ratos y en la lista hay pocos con herramientas:
// con tres intentos un mal rato de los dos primeros deja la respuesta en
// manos del último de la fila, que suele ser el más flojo.
const MAXIMO_MODELOS = 5;

export function hayOpenRouter(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

// ---- Qué modelos usar ------------------------------------------------

type ModeloOpenRouter = {
  id: string;
  name?: string;
  context_length?: number;
  architecture?: { input_modalities?: string[] };
  supported_parameters?: string[];
};

// A igualdad de todo, estos primero. Son familias, no nombres exactos:
// los nombres cambian cada pocas semanas y escribirlos aquí es firmar
// que un día dejará de funcionar sin que nadie toque nada.
const PREFERIDAS = ["gemini", "gemma", "llama", "qwen", "mistral", "deepseek"];

// Los modelos muy pequeños saben contestar "hola", pero no saben usar
// herramientas: contestan vacío o se inventan la llamada. Van al final
// de la fila, nunca fuera: si un día son lo único gratis que queda, es
// mejor eso que no contestar.
const MINIMO_MIL_MILLONES = 7;

export function esChico(id: string): boolean {
  // Del propio nombre: "liquid/lfm-3-1.7b:free" -> 1.7. Se toma el
  // número MÁS GRANDE con "b" pegada, porque los mixtos llevan dos
  // ("gemma-4-26b-a4b" son 26 mil millones en total y 4 despiertos a la
  // vez) y el que manda para saber cuánto sabe es el total.
  const encontrados = [...id.toLowerCase().matchAll(/(\d+(?:\.\d+)?)b(?![a-z0-9])/g)]
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n));
  if (encontrados.length === 0) return false;
  return Math.max(...encontrados) < MINIMO_MIL_MILLONES;
}

type ListaGuardada = { cuando: number; modelos: ModeloOpenRouter[] };

const UN_DIA_MS = 24 * 60 * 60 * 1000;

async function listaDeModelos(): Promise<ModeloOpenRouter[]> {
  const guardada = await readDoc<ListaGuardada>("openrouter-modelos", () => ({
    cuando: 0,
    modelos: [],
  }));
  if (guardada.modelos.length > 0 && Date.now() - guardada.cuando < UN_DIA_MS) {
    return guardada.modelos;
  }

  try {
    // No lleva clave a propósito: es una lista pública y así se puede
    // pedir aunque la clave esté mal puesta.
    const res = await fetch(`${BASE}/models`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return guardada.modelos;

    const datos = (await res.json()) as { data?: ModeloOpenRouter[] };
    const modelos = (datos.data ?? []).filter((m) => m.id?.endsWith(":free"));
    if (modelos.length === 0) return guardada.modelos;

    await writeDoc("openrouter-modelos", { cuando: Date.now(), modelos });
    return modelos;
  } catch {
    // Sin lista nueva se usa la de ayer; y si tampoco hay, lo que diga
    // la variable de entorno. Quedarse sin modelos por no poder leer una
    // lista sería apagar el asistente por un detalle.
    return guardada.modelos;
  }
}

export async function modelosCandidatos(opciones: {
  herramientas: boolean;
  imagenes: boolean;
}): Promise<string[]> {
  // Una lista escrita a mano manda sobre todo: es la salida de urgencia
  // si OpenRouter cambia algo y hay que fijar un modelo concreto.
  const aMano = (process.env.OPENROUTER_MODELOS || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  if (aMano.length > 0) return aMano;

  const todos = await listaDeModelos();
  const sinCupo = await agotadosHoy();

  const sirven = todos.filter((m) => {
    if (sinCupo.has(m.id)) return false;
    const soporta = m.supported_parameters ?? [];
    if (opciones.herramientas && !soporta.includes("tools")) return false;
    const entradas = m.architecture?.input_modalities ?? ["text"];
    if (opciones.imagenes && !entradas.includes("image")) return false;
    return true;
  });

  const puntos = (m: ModeloOpenRouter) => {
    const i = PREFERIDAS.findIndex((p) => m.id.toLowerCase().includes(p));
    return i === -1 ? PREFERIDAS.length : i;
  };

  return sirven
    .sort(
      (a, b) =>
        Number(esChico(a.id)) - Number(esChico(b.id)) ||
        puntos(a) - puntos(b) ||
        (b.context_length ?? 0) - (a.context_length ?? 0)
    )
    .map((m) => m.id);
}

// ---- Traducción de la conversación -----------------------------------
//
//  La tienda guarda las conversaciones con la forma de Google (partes
//  con functionCall y functionResponse). OpenRouter habla el formato de
//  OpenAI (mensajes con tool_calls y mensajes de rol "tool"). Esto es el
//  puente, y está aquí y en un solo sitio para que nadie tenga que
//  pensar en los dos formatos a la vez.

type ContenidoOR =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

type MensajeOR = {
  role: "system" | "user" | "assistant" | "tool";
  content?: ContenidoOR;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
};

// El identificador de una llamada a herramienta. OpenRouter exige que el
// resultado diga a qué llamada responde; como la conversación guardada
// no los tiene, se arman a partir de la posición, que es estable: la
// llamada j del mensaje i.
function idDeLlamada(mensaje: number, parte: number): string {
  return `c${mensaje}_${parte}`;
}

export function aMensajesOpenRouter(
  instruccion: string,
  mensajes: Mensaje[]
): MensajeOR[] {
  const salida: MensajeOR[] = [{ role: "system", content: instruccion }];

  mensajes.forEach((mensaje, i) => {
    if (mensaje.role === "model") {
      const textos: string[] = [];
      const llamadas: NonNullable<MensajeOR["tool_calls"]> = [];

      mensaje.parts.forEach((parte, j) => {
        if ("text" in parte && parte.text) textos.push(parte.text);
        if ("functionCall" in parte) {
          llamadas.push({
            id: idDeLlamada(i, j),
            type: "function",
            function: {
              name: parte.functionCall.name,
              arguments: JSON.stringify(parte.functionCall.args ?? {}),
            },
          });
        }
      });

      salida.push({
        role: "assistant",
        content: textos.join("\n") || "",
        ...(llamadas.length > 0 ? { tool_calls: llamadas } : {}),
      });
      return;
    }

    // Un turno de la persona puede traer dos cosas distintas: lo que
    // escribió, y los resultados de las herramientas que pidió el modelo.
    // En este formato son mensajes separados.
    const contenido: Exclude<ContenidoOR, string> = [];
    const resultados: MensajeOR[] = [];
    let cuantosResultados = 0;

    for (const parte of mensaje.parts) {
      if ("text" in parte && parte.text) {
        contenido.push({ type: "text", text: parte.text });
      } else if ("inlineData" in parte) {
        contenido.push({
          type: "image_url",
          image_url: {
            url: `data:${parte.inlineData.mimeType};base64,${parte.inlineData.data}`,
          },
        });
      } else if ("functionResponse" in parte) {
        // El resultado responde a la llamada que hizo el modelo en el
        // mensaje anterior, en el mismo orden en que las pidió.
        const anterior = mensajes[i - 1];
        const llamadasAnteriores =
          anterior?.role === "model"
            ? anterior.parts
                .map((p, j) => ("functionCall" in p ? idDeLlamada(i - 1, j) : null))
                .filter((x): x is string => x !== null)
            : [];

        resultados.push({
          role: "tool",
          tool_call_id: llamadasAnteriores[cuantosResultados] ?? `c${i}_${cuantosResultados}`,
          name: parte.functionResponse.name,
          content: JSON.stringify(parte.functionResponse.response ?? {}),
        });
        cuantosResultados++;
      }
    }

    // Los resultados van ANTES del texto nuevo: es el orden real de los
    // hechos, y algunos modelos se pierden si se invierte.
    salida.push(...resultados);
    if (contenido.length > 0) salida.push({ role: "user", content: contenido });
  });

  return salida;
}

// Los esquemas de las herramientas vienen escritos como los quiere
// Google ("OBJECT", "STRING"); aquí se piden en minúscula. Se baja el
// tipo y se deja todo lo demás igual.
export function aEsquemaJson(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(aEsquemaJson);
  if (valor && typeof valor === "object") {
    const salida: Record<string, unknown> = {};
    for (const [clave, v] of Object.entries(valor as Record<string, unknown>)) {
      salida[clave] =
        clave === "type" && typeof v === "string" ? v.toLowerCase() : aEsquemaJson(v);
    }
    return salida;
  }
  return valor;
}

// ---- La respuesta ----------------------------------------------------

type RespuestaOR = {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: Array<{
        id?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string; code?: number };
};

function leerRespuesta(datos: RespuestaOR, modelo: string): RespuestaModelo {
  const mensaje = datos.choices?.[0]?.message;
  const texto = (mensaje?.content ?? "").trim();

  const llamadas = (mensaje?.tool_calls ?? [])
    .map((l) => {
      const nombre = l.function?.name ?? "";
      let args: Record<string, unknown> = {};
      try {
        // Los argumentos vienen como texto JSON. Un modelo puede
        // mandarlo roto; eso no debe tumbar la conversación entera.
        args = JSON.parse(l.function?.arguments || "{}") as Record<string, unknown>;
      } catch {
        args = {};
      }
      return { nombre, args };
    })
    .filter((l) => l.nombre);

  // Se devuelve con la forma de siempre para que el resto del bot no
  // cambie: texto y llamadas, como si hubiera hablado Google.
  const partesCrudas: Parte[] = [
    ...(texto ? [{ text: texto }] : []),
    ...llamadas.map((l) => ({ functionCall: { name: l.nombre, args: l.args } })),
  ];

  return {
    modelo,
    texto,
    llamadas,
    consumo: {
      entrada: datos.usage?.prompt_tokens ?? 0,
      salida: datos.usage?.completion_tokens ?? 0,
    },
    partesCrudas,
  };
}

// ---- Errores ---------------------------------------------------------

function mensajeDeError(cuerpo: string): string {
  try {
    const j = JSON.parse(cuerpo) as { error?: { message?: string } };
    return (j.error?.message ?? "").slice(0, 300);
  } catch {
    return cuerpo.slice(0, 200);
  }
}

// Un 429 puede ser "demasiado rápido" (se prueba otro modelo y ya) o
// "se acabó el día" (hasta mañana no hay nada que hacer). Decirlo mal
// hace que el bot insista contra una puerta cerrada.
function esDelDia(detalle: string): boolean {
  return /per-?day|daily limit|free-models-per-day|rate limit exceeded.*day/i.test(
    detalle
  );
}

// ---- La puerta de entrada --------------------------------------------

export async function preguntarAOpenRouter(opciones: {
  instruccion: string;
  mensajes: Mensaje[];
  herramientas: Array<{
    name: string;
    description: string;
    parameters?: Record<string, unknown>;
  }>;
  limiteMs?: number;
  orden?: "mejor" | "economico";
  maximoSalida?: number;
}): Promise<RespuestaModelo> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new ErrorAgente(
      "Falta la clave OPENROUTER_API_KEY. Se crea en openrouter.ai/settings/keys y se guarda en las variables de entorno."
    );
  }

  const fin = Date.now() + (opciones.limiteMs ?? 10 * 60 * 1000);
  const necesitaHerramientas = opciones.herramientas.length > 0;
  const llevaImagenes = opciones.mensajes.some((m) =>
    m.parts.some((p) => "inlineData" in p)
  );

  const cola = await modelosCandidatos({
    herramientas: necesitaHerramientas,
    imagenes: llevaImagenes,
  });

  if (cola.length === 0) {
    throw new ErrorAgente(
      "No encontré ningún modelo gratis disponible ahora mismo. Vuelve a intentarlo en un rato."
    );
  }

  const cuerpo = {
    messages: aMensajesOpenRouter(opciones.instruccion, opciones.mensajes),
    ...(necesitaHerramientas
      ? {
          tools: opciones.herramientas.map((h) => ({
            type: "function" as const,
            function: {
              name: h.name,
              description: h.description,
              ...(h.parameters
                ? { parameters: aEsquemaJson(h.parameters) as Record<string, unknown> }
                : {}),
            },
          })),
        }
      : {}),
    ...(opciones.maximoSalida ? { max_tokens: opciones.maximoSalida } : {}),
  };

  let ultimoDetalle = "";
  let ultimoEstado = 0;

  for (const modelo of cola.slice(0, MAXIMO_MODELOS)) {
    const queda = fin - Date.now();
    if (queda <= 1_000) break;

    let res: Response;
    try {
      res = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
          // Identifican la tienda en OpenRouter. No son obligatorios,
          // pero sin ellos todo el consumo sale como "una app".
          "HTTP-Referer": urlDelSitio(),
          "X-Title": store.name,
        },
        cache: "no-store",
        body: JSON.stringify({ model: modelo, ...cuerpo }),
        signal: AbortSignal.timeout(Math.min(queda, LIMITE_POR_INTENTO_MS)),
      });
    } catch {
      // Tiempo agotado o sin red: el siguiente modelo tiene su propia
      // suerte, así que se prueba antes de rendirse.
      ultimoDetalle = "no respondió a tiempo";
      ultimoEstado = 408;
      continue;
    }

    if (res.ok) {
      const datos = (await res.json()) as RespuestaOR;
      // OpenRouter a veces devuelve 200 con un error dentro.
      if (datos.error?.message) {
        ultimoDetalle = datos.error.message;
        ultimoEstado = datos.error.code ?? 500;
        continue;
      }
      if (opciones.orden !== "economico") await marcarEnUso(modelo);
      return leerRespuesta(datos, modelo);
    }

    ultimoEstado = res.status;
    ultimoDetalle = mensajeDeError(await res.text().catch(() => ""));

    if (res.status === 401 || res.status === 403) {
      throw new ErrorAgente(
        "La clave de OpenRouter no es válida o fue revocada. Crea otra en openrouter.ai/settings/keys."
      );
    }

    if (res.status === 402) {
      const error = new ErrorAgente(
        "La cuenta de OpenRouter se quedó sin créditos."
      );
      error.cuota = { porDia: true, detalle: ultimoDetalle };
      error.modelo = modelo;
      throw error;
    }

    if (res.status === 429 && esDelDia(ultimoDetalle)) {
      // Se acabó el cupo del día de ese modelo: queda anotado para no
      // volver a intentarlo y para que se vea en el panel.
      await marcarAgotado(modelo, ultimoDetalle);
      await anotarFreno({
        porDia: true,
        detalle: ultimoDetalle,
        modelo,
        contarConsulta: true,
      });
    }

    // 429 por minuto, 404 (modelo retirado), 5xx (saturado): todo eso se
    // arregla probando con otro.
  }

  const error = new ErrorAgente(
    ultimoEstado === 429
      ? "Los modelos gratis están al tope ahora mismo. Vuelve a intentarlo en un rato."
      : "No pude hablar con la IA. Intenta de nuevo."
  );
  if (ultimoEstado === 429) {
    error.cuota = { porDia: esDelDia(ultimoDetalle), detalle: ultimoDetalle };
  }
  if (ultimoEstado === 408) error.tiempoAgotado = true;
  throw error;
}

// ---- Cuánto cupo queda -----------------------------------------------

export type CuotaOpenRouter = {
  usados?: number;
  limite?: number;
  quedan?: number;
};

export async function cuotaDeOpenRouter(): Promise<CuotaOpenRouter | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`${BASE}/key`, {
      headers: { authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;

    const datos = (await res.json()) as {
      data?: {
        free_model_daily_requests?: {
          used?: number;
          limit?: number | null;
          remaining?: number | null;
        };
      };
    };

    const cuota = datos.data?.free_model_daily_requests;
    if (!cuota) return null;
    return {
      usados: cuota.used ?? undefined,
      limite: cuota.limit ?? undefined,
      quedan: cuota.remaining ?? undefined,
    };
  } catch {
    return null;
  }
}
