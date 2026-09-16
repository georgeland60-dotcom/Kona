// =============================================================
//  CATEGORÍAS
//
//  Las de siempre viven en data/categories.ts (la "semilla"), y las que
//  se crean sobre la marcha se guardan en la base. Aquí se juntan.
//
//  ¿Por qué no basta con la lista de siempre? Porque la tienda crece: el
//  día que entran botas no hay dónde ponerlas, y obligar a tocar código
//  para eso deja el producto sin subir. Crear una categoría es un cambio
//  comercial, como un descuento.
//
//  Las de la semilla no se pueden borrar ni renombrar desde aquí: son el
//  menú que ya está en la web y tienen productos colgando.
// =============================================================

import { categories as semilla } from "@/data/categories";
import { readDoc, writeDoc } from "@/lib/kv";
import type { Category } from "@/lib/types";

// Etiquetas que la tienda usa para otras cosas: no pueden ser categorías
// o se pisarían con los bloques del inicio.
const RESERVADOS = ["sale", "nuevos-ingresos", "todas", "varias"];

const MAXIMO = 40;

type Guardadas = { categorias: Category[] };

function vacio(): Guardadas {
  return { categorias: [] };
}

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export function slugificar(s: string): string {
  return normalizar(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// Todas las categorías: primero las de siempre (que son el orden del
// menú) y detrás las nuevas, en el orden en que se crearon.
export async function getCategorias(): Promise<Category[]> {
  const { categorias } = await readDoc<Guardadas>("categorias", vacio);
  const slugs = new Set(semilla.map((c) => c.slug));
  return [...semilla, ...categorias.filter((c) => !slugs.has(c.slug))];
}

// Busca por slug o por nombre, tolerando tildes y mayúsculas.
export async function buscarCategoria(
  ref: string
): Promise<Category | undefined> {
  const aguja = normalizar(ref);
  if (!aguja) return undefined;
  const todas = await getCategorias();
  return todas.find(
    (c) => c.slug === ref || normalizar(c.slug) === aguja || normalizar(c.name) === aguja
  );
}

export type ResultadoCategoria =
  | { ok: true; categoria: Category }
  | { ok: false; mensaje: string };

export async function crearCategoria(
  nombre: string
): Promise<ResultadoCategoria> {
  const limpio = nombre.replace(/\s+/g, " ").trim();

  if (limpio.length < 3) {
    return { ok: false, mensaje: "El nombre de la categoría es muy corto." };
  }
  if (limpio.length > 40) {
    return { ok: false, mensaje: "El nombre de la categoría es demasiado largo." };
  }

  const slug = slugificar(limpio);
  if (!slug) {
    return {
      ok: false,
      mensaje: `"${nombre}" no sirve como nombre de categoría (necesita letras o números).`,
    };
  }
  if (RESERVADOS.includes(slug)) {
    return {
      ok: false,
      mensaje: `"${limpio}" no se puede usar: esa etiqueta ya la usa la tienda para otra cosa.`,
    };
  }

  const ya = await buscarCategoria(limpio);
  if (ya) {
    return {
      ok: false,
      mensaje: `La categoría "${ya.name}" ya existe (${ya.slug}).`,
    };
  }

  const guardadas = await readDoc<Guardadas>("categorias", vacio);
  if (semilla.length + guardadas.categorias.length >= MAXIMO) {
    return {
      ok: false,
      mensaje: `Ya hay ${MAXIMO} categorías; con más, el menú de la tienda deja de ser usable.`,
    };
  }

  const categoria: Category = { slug, name: limpio };
  guardadas.categorias.push(categoria);

  const guardado = await writeDoc("categorias", guardadas);
  if (!guardado) {
    return {
      ok: false,
      mensaje: "No pude guardar la categoría: falta configurar la base de datos.",
    };
  }

  return { ok: true, categoria };
}
