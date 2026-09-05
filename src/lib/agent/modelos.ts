// =============================================================
//  QUÉ MODELO SE ESTÁ USANDO Y CUÁLES SE AGOTARON
//
//  La capa gratuita de Google es POR MODELO y se reinicia cada día. Si
//  el modelo preferido se queda sin cupo, no hay por qué dejar de
//  trabajar: hay otros que sí tienen. Para eso hace falta recordar dos
//  cosas entre una petición y otra:
//
//   - cuál está en uso ahora mismo (para mostrarlo en el panel), y
//   - cuáles ya dijo Google que están agotados HOY (para saltárselos
//     en vez de volver a chocar con la misma pared).
//
//  Se guarda en la base compartida, no en memoria del servidor: cada
//  petición puede caer en una máquina distinta, y si se olvidara,
//  volvería a gastar un intento en el modelo agotado cada vez.
// =============================================================

import { readDoc, writeDoc } from "@/lib/kv";

type Agotado = {
  fecha: string; // AAAA-MM-DD en el que se agotó
  cuando: string; // ISO exacto, para mostrarlo
  detalle: string; // lo que dijo Google
};

type EstadoModelos = {
  enUso?: string;
  agotados: Record<string, Agotado>;
};

function vacio(): EstadoModelos {
  return { agotados: {} };
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
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
  const fecha = hoy();
  return new Set(
    Object.entries(estado.agotados)
      .filter(([, a]) => a.fecha === fecha)
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
}> {
  const estado = await estadoModelos();
  const fecha = hoy();
  return {
    enUso: estado.enUso,
    agotados: Object.entries(estado.agotados)
      .filter(([, a]) => a.fecha === fecha)
      .map(([modelo, a]) => ({
        modelo,
        cuando: a.cuando,
        detalle: a.detalle,
      })),
  };
}
