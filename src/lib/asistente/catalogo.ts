// =============================================================
//  EL CATÁLOGO, RESUMIDO PARA EL ASISTENTE
//
//  El asistente atiende a quien entra a comprar, así que tiene que
//  hablar de productos que EXISTEN, con su precio de hoy y sus tallas
//  disponibles. Inventar un producto o una talla agotada es peor que no
//  contestar: la clienta lo pide y no está.
//
//  Se le pasa el catálogo entero resumido (una línea por producto) en
//  vez de darle herramientas para buscar. Con ~100 productos ocupa poco
//  y ahorra idas y vueltas, que es lo que consume cupo de verdad.
// =============================================================

import { getProducts } from "@/lib/store-data";
import { getCategorias } from "@/lib/categorias-data";
import type { Product } from "@/lib/types";

// El resumen se guarda un ratito: la tienda no cambia cada segundo y
// así una conversación de varios mensajes no relee todo cada vez.
const VIGENCIA_MS = 60_000;
let cache: { texto: string; productos: Product[]; hasta: number } | null = null;

function tallasDisponibles(p: Product): string {
  const conStock = p.variants.filter((v) => v.stock > 0);
  if (conStock.length === 0) return "AGOTADO";
  return conStock.map((v) => v.size).join("/");
}

// Una línea por producto: lo justo para recomendar con criterio.
function linea(p: Product): string {
  const partes = [
    `${p.slug} | ${p.name} | S/ ${p.price}`,
    p.oldPrice ? `antes S/ ${p.oldPrice}` : "",
    `${p.category}`,
    `tallas ${tallasDisponibles(p)}`,
    (p.description ?? "").replace(/\s+/g, " ").slice(0, 160),
  ].filter(Boolean);
  return `- ${partes.join(" | ")}`;
}

export type Catalogo = {
  texto: string;
  productos: Product[];
};

export async function catalogoParaAsistente(): Promise<Catalogo> {
  if (cache && Date.now() < cache.hasta) {
    return { texto: cache.texto, productos: cache.productos };
  }

  const [productos, categorias] = await Promise.all([
    getProducts(), // con descuentos ya aplicados: el precio que ve la clienta
    getCategorias(),
  ]);

  const visibles = productos.filter((p) => p.active !== false);

  const texto = [
    `Categorías: ${categorias.map((c) => c.name).join(", ")}.`,
    "",
    "CATÁLOGO (slug | nombre | precio | categoría | tallas con stock | descripción).",
    "Las tallas que ves aquí son las ÚNICAS que existen en cada prenda: no",
    "todas van por letras (los pantalones van por número) y \"Única\" quiere",
    "decir que esa pieza no lleva talla. Nunca nombres una que no esté:",
    ...visibles.map(linea),
  ].join("\n");

  cache = { texto, productos: visibles, hasta: Date.now() + VIGENCIA_MS };
  return { texto, productos: visibles };
}
