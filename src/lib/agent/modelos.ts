// =============================================================
//  QUÉ MODELO SE ESTÁ USANDO Y CUÁLES SE AGOTARON
//
//  El límite de consumo de Google es POR MODELO y se reinicia cada día.
//  Si el modelo preferido llega a su tope, no hay por qué dejar de
//  trabajar: hay otros que aún tienen margen. Para eso hace falta
//  recordar tres cosas entre una petición y otra:
//
//   - cuál está en uso ahora mismo (para mostrarlo en el panel),
//   - cuáles ya dijo Google que llegaron a su tope HOY (para
//     saltárselos en vez de volver a chocar con la misma pared), y
//   - CUÁNTAS consultas aguantó cada uno antes de toparse. Ese número no
//     lo publica la API en ningún lado, así que la única forma honesta de
//     saberlo es medirlo: el día que Google corta, lo que se llevaba
//     consumido ES el límite. Mejor un número medido que uno inventado.
//
//  Se guarda en la base compartida, no en memoria del servidor: cada
//  petición puede caer en una máquina distinta, y si se olvidara,
//  volvería a gastar un intento en el modelo agotado cada vez.
// =============================================================

import { readDoc, writeDoc } from "@/lib/kv";
import { diaDeGoogle, siguenEnElMismoDiaDeGoogle } from "@/lib/fechas";

type Agotado = {
  fecha: string; // AAAA-MM-DD en el que se agotó
  cuando: string; // ISO exacto, para mostrarlo
  detalle: string; // lo que dijo Google
};

// El tope real de un modelo, medido el día que Google cortó.
export type LimiteObservado = {
  consultas: number; // cuántas aguantó ese día
  fecha: string; // cuándo se midió (AAAA-MM-DD)
};

type EstadoModelos = {
  enUso?: string;
  agotados: Record<string, Agotado>;
  limites?: Record<string, LimiteObservado>;
};

function vacio(): EstadoModelos {
  return { agotados: {}, limites: {} };
}

// El día que cuenta aquí es el de GOOGLE (hora del Pacífico), no el
// nuestro: es él quien lleva la cuenta de las consultas y quien decide
// cuándo se reinicia. Usar el día de aquí hacía que un corte de anoche
// siguiera pareciendo vigente cuando Google ya había reiniciado, y al
// revés.
function hoy(): string {
  return diaDeGoogle();
}

// Un cachecito para no ir a la base en cada llamada al modelo. Dura poco
// a propósito: si otro proceso marca un modelo como agotado, queremos
// enterarnos pronto.
let cache: { valor: EstadoModelos; hasta: number } | null = null;
const CACHE_MS = 30_000;

export async function estadoModelos(): Promise<EstadoModelos> {
  if (cache && Date.now() < cache.hasta) return cache.valor;
  const valor = await readDoc<EstadoModelos>("agente-modelos", vacio);
  cache = { valor, hasta: Date.now() + CACHE_MS };
  return valor;
}

async function guardar(valor: EstadoModelos): Promise<void> {
  cache = { valor, hasta: Date.now() + CACHE_MS };
  await writeDoc("agente-modelos", valor);
}

// Los que hoy no sirven. Los de días anteriores no cuentan: el cupo se
// renueva solo.
export async function agotadosHoy(): Promise<Set<string>> {
  const estado = await estadoModelos();
  return new Set(
    Object.entries(estado.agotados)
      .filter(([, a]) => siguenEnElMismoDiaDeGoogle(a.cuando))
      .map(([modelo]) => modelo)
  );
}

export async function marcarAgotado(
  modelo: string,
  detalle: string
): Promise<void> {
  try {
    const estado = await estadoModelos();
    estado.agotados[modelo] = {
      fecha: hoy(),
      cuando: new Date().toISOString(),
      detalle: detalle.slice(0, 300),
    };
    if (estado.enUso === modelo) delete estado.enUso;
    await guardar(estado);
  } catch {
    // Es una ayuda, no puede tumbar al agente.
  }
}

// Guarda el tope medido de un modelo: lo que se llevaba consumido el día
// que Google cortó. Se guarda con su fecha, y se vuelve a medir cada vez
// que vuelve a cortar, porque Google cambia estos límites sin avisar.
export async function anotarLimiteObservado(
  modelo: string,
  consultas: number,
  fecha: string
): Promise<void> {
  if (consultas <= 0) return;
  try {
    const estado = await estadoModelos();
    if (!estado.limites) estado.limites = {};
    if (estado.limites[modelo]?.fecha === fecha) return; // ya medido hoy
    estado.limites[modelo] = { consultas, fecha };
    await guardar(estado);
  } catch {
    // Es información, no puede romper nada.
  }
}

export async function marcarEnUso(modelo: string): Promise<void> {
  try {
    const estado = await estadoModelos();
    if (estado.enUso === modelo) return; // no reescribir por gusto
    estado.enUso = modelo;
    await guardar(estado);
  } catch {
    // Igual: es solo información para el panel.
  }
}

// Lo que necesita el panel: quién trabaja y quién se quedó sin cupo hoy.
export async function resumenModelos(): Promise<{
  enUso?: string;
  agotados: Array<{ modelo: string; cuando: string; detalle: string }>;
  limites: Record<string, LimiteObservado>;
}> {
  const estado = await estadoModelos();
  return {
    enUso: estado.enUso,
    agotados: Object.entries(estado.agotados)
      .filter(([, a]) => siguenEnElMismoDiaDeGoogle(a.cuando))
      .map(([modelo, a]) => ({
        modelo,
        cuando: a.cuando,
        detalle: a.detalle,
      })),
    limites: estado.limites ?? {},
  };
}

// ¿De qué modelos ya sabemos el tope y de cuáles no? Lo usa el ciclo del
// agente para medirlo justo después de que Google corte.
export async function modelosSinLimiteMedido(
  candidatos: string[]
): Promise<string[]> {
  const estado = await estadoModelos();
  const fecha = hoy();
  return candidatos.filter(
    (m) => (estado.limites ?? {})[m]?.fecha !== fecha
  );
}
