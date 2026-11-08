// =============================================================
//  LA PUERTA ÚNICA A LA IA
//
//  Detrás puede haber OpenRouter (lo normal desde noviembre de 2026) o
//  Google directo. Todo lo demás de la tienda —el asistente, el bot, el
//  panel— habla SOLO con este archivo y no sabe cuál de los dos
//  contestó. Eso es lo que permite cambiar de proveedor sin tocar
//  catorce sitios.
//
//  Por qué OpenRouter: con una sola clave se llega a modelos de varios
//  fabricantes, así que cuando uno está saturado la misma llamada sale
//  por otro. Hablando con Google directo, una tarde mala dejaba al
//  asistente mudo delante de las clientas.
//
//  El respaldo: si el proveedor principal falla por algo que no sea la
//  clave ni el tiempo, se prueba con el otro antes de rendirse —pero
//  solo si está configurado. Dos puertas distintas es justamente lo que
//  hace que una tienda no se quede sin asistente por la caída de nadie.
// =============================================================

import {
  ErrorAgente,
  preguntarAlModelo as preguntarAGemini,
  type Mensaje,
  type RespuestaModelo,
} from "@/lib/agent/gemini";
import {
  hayOpenRouter,
  preguntarAOpenRouter,
} from "@/lib/agent/openrouter";

export { ErrorAgente };
export type {
  Consumo,
  LlamadaHerramienta,
  Mensaje,
  Parte,
  RespuestaModelo,
} from "@/lib/agent/gemini";

export type Proveedor = "openrouter" | "gemini";

type Opciones = {
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
};

// Quién contesta. Se puede forzar con IA_PROVEEDOR; si no, manda que
// haya clave de OpenRouter, que es el camino preferido.
export function proveedorDeIa(): Proveedor {
  const pedido = (process.env.IA_PROVEEDOR || "").trim().toLowerCase();
  if (pedido === "gemini") return "gemini";
  if (pedido === "openrouter") return "openrouter";
  return hayOpenRouter() ? "openrouter" : "gemini";
}

function hayGemini(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export async function preguntarAlModelo(
  opciones: Opciones
): Promise<RespuestaModelo> {
  const principal = proveedorDeIa();

  try {
    return principal === "openrouter"
      ? await preguntarAOpenRouter(opciones)
      : await preguntarAGemini(opciones);
  } catch (error) {
    const respaldo: Proveedor = principal === "openrouter" ? "gemini" : "openrouter";
    const hayRespaldo = respaldo === "gemini" ? hayGemini() : hayOpenRouter();

    // Que se acabe el tiempo no se arregla cambiando de proveedor: el
    // presupuesto de la tanda ya se gastó. Y una clave mala tampoco.
    const sirveReintentar =
      hayRespaldo &&
      error instanceof ErrorAgente &&
      !error.tiempoAgotado &&
      !/clave|api.?key/i.test(error.message);

    if (!sirveReintentar) throw error;

    console.warn(
      `[ia] ${principal} falló (${(error as Error).message}); probando con ${respaldo}`
    );
    return respaldo === "gemini"
      ? preguntarAGemini(opciones)
      : preguntarAOpenRouter(opciones);
  }
}
