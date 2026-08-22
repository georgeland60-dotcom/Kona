// =============================================================
//  HISTORIAL DE CAMBIOS (trazabilidad)
//
//  Anota cada cambio que se aplica de verdad en la tienda: cuándo,
//  quién, de qué tipo y sobre qué categoría de productos. Sirve para
//  responder preguntas del tipo "¿por qué las carteras están a este
//  precio?" o "¿qué descuentos se hicieron en agosto?".
//
//  Solo se guardan los cambios CONFIRMADOS. Lo que se propuso y se
//  canceló no ensucia el historial.
// =============================================================

import { readDoc, writeDoc } from "@/lib/kv";

// De qué trata el cambio. Es una de las dos formas de filtrar.
export type TipoCambio =
  | "descuentos"
  | "precios"
  | "ofertas"
  | "productos"
  | "stock"
  | "temporada"
  | "otro";

export const TIPOS_CAMBIO: TipoCambio[] = [
  "descuentos",
  "precios",
  "ofertas",
  "productos",
  "stock",
  "temporada",
  "otro",
];

export type CambioRegistrado = {
  id: string;
  fecha: string; // ISO
  quien: string; // quién lo confirmó
  origen: "telegram" | "panel";
  tipo: TipoCambio;
  categoria: string; // slug de categoría afectada, o "todas"
  resumen: string; // lo que se pidió, en cristiano
  detalle: string; // lo que quedó hecho, con los valores concretos
  ok: boolean; // false = se intentó pero falló
};

type Historial = { cambios: CambioRegistrado[] };

// Tope de entradas. El historial vive en la misma base que la tienda, así
// que conviene que no crezca sin freno; con 500 hay meses de margen.
const MAXIMO = 500;

function vacio(): Historial {
  return { cambios: [] };
}

export async function getHistorial(filtros?: {
  categoria?: string;
  tipo?: string;
  desde?: string; // ISO o AAAA-MM-DD
  limite?: number;
}): Promise<CambioRegistrado[]> {
  const { cambios } = await readDoc<Historial>("historial", vacio);
  let lista = cambios;

  if (filtros?.categoria && filtros.categoria !== "todas") {
    // "todas" en el filtro significa "no filtrar". Un cambio global (que
    // afecta a toda la tienda) se guarda con categoria "todas" y por eso
    // aparece siempre: también afectó a la categoría que estés mirando.
    lista = lista.filter(
      (c) => c.categoria === filtros.categoria || c.categoria === "todas"
    );
  }
  if (filtros?.tipo) {
    lista = lista.filter((c) => c.tipo === filtros.tipo);
  }
  if (filtros?.desde) {
    const desde = new Date(filtros.desde);
    if (!Number.isNaN(desde.getTime())) {
      lista = lista.filter((c) => new Date(c.fecha) >= desde);
    }
  }
  return filtros?.limite ? lista.slice(0, filtros.limite) : lista;
}

// Guarda varias entradas de golpe (un mensaje puede traer varios cambios).
export async function registrarCambios(
  nuevos: Array<Omit<CambioRegistrado, "id" | "fecha">>
): Promise<void> {
  if (nuevos.length === 0) return;

  const historial = await readDoc<Historial>("historial", vacio);
  const ahora = new Date().toISOString();

  // Los más recientes primero: es como se van a leer siempre.
  const entradas: CambioRegistrado[] = nuevos.map((c, i) => ({
    ...c,
    fecha: ahora,
    id: `${Date.now()}-${i}`,
  }));

  historial.cambios = [...entradas, ...historial.cambios].slice(0, MAXIMO);
  await writeDoc("historial", historial);
}

// Cuántos cambios hay por categoría y por tipo (para los resúmenes).
export function contarPor(
  cambios: CambioRegistrado[],
  campo: "categoria" | "tipo"
): Array<{ clave: string; total: number }> {
  const cuenta = new Map<string, number>();
  for (const c of cambios) {
    cuenta.set(c[campo], (cuenta.get(c[campo]) ?? 0) + 1);
  }
  return [...cuenta.entries()]
    .map(([clave, total]) => ({ clave, total }))
    .sort((a, b) => b.total - a.total);
}
