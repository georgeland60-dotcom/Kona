import type { Product } from "@/lib/types";

// =============================================================
//  COLECCIONES DEL INICIO
//  Bloques temáticos que se muestran en la portada (home).
//  Cada colección elige sus productos por "categoría" o por
//  "colección transversal" (tag en el campo collections del producto).
//  Para editar el orden o agregar una, toca este arreglo.
// =============================================================

export type HomeCollection = {
  slug: string; // se usa para el enlace /tienda?cat=<slug>
  title: string;
  subtitle: string;
  // cómo se eligen los productos de esta colección:
  by: "collection" | "category";
  value: string;
  limit?: number; // cuántos mostrar en el inicio (por defecto 4)
};

export const homeCollections: HomeCollection[] = [
  {
    slug: "nuevos-ingresos",
    title: "Nuevos Ingresos",
    subtitle: "Lo último que llegó a Kona",
    by: "collection",
    value: "nuevos-ingresos",
    limit: 4,
  },
  {
    slug: "ropa-de-bano",
    title: "Ropa de baño",
    subtitle: "Colección Bali · disfruta el verano",
    by: "category",
    value: "ropa-de-bano",
    limit: 4,
  },
  {
    slug: "vestidos",
    title: "Vestidos",
    subtitle: "Frescos y femeninos para cada ocasión",
    by: "category",
    value: "vestidos",
    limit: 4,
  },
  {
    slug: "carteras",
    title: "Carteras",
    subtitle: "El complemento que completa tu look",
    by: "category",
    value: "carteras",
    limit: 4,
  },
  {
    slug: "sale",
    title: "Sale",
    subtitle: "Ofertas por tiempo limitado",
    by: "collection",
    value: "sale",
    limit: 4,
  },
];

// Devuelve los productos que pertenecen a una colección del inicio.
export function pickCollection(
  products: Product[],
  col: HomeCollection
): Product[] {
  const match = (p: Product) =>
    col.by === "category"
      ? p.category === col.value
      : (p.collections ?? []).includes(col.value);
  return products.filter(match).slice(0, col.limit ?? 4);
}
