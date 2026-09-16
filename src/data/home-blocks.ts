import type { Product } from "@/lib/types";

// =============================================================
//  LOS 4 BLOQUES DE CATEGORIA DEL INICIO (diseno v3)
//  Son los cuadros verticales grandes que se ven al entrar.
//  Para cambiar uno, edita este arreglo: el nombre que se lee,
//  de donde saca los productos y su color.
//
//  "by" dice como se eligen los productos:
//    - "category"   -> compara con el campo category del producto
//    - "collection" -> busca la etiqueta dentro de collections
// =============================================================

export type HomeBlock = {
  key: string;
  name: string; // nombre visible, ej "Nuevos ingresos"
  tagline: string; // frase de apoyo debajo del nombre
  by: "category" | "collection";
  value: string; // slug de la categoria o de la coleccion
  image: string; // foto de respaldo si la categoria aun no tiene productos
  // Clases de color (Tailwind necesita el nombre completo escrito,
  // por eso se guardan asi y no como "bg-" + color).
  badge: string;
  bar: string;
};

export const homeBlocks: HomeBlock[] = [
  {
    key: "blazers",
    name: "Blazers",
    tagline: "Estructura que levanta cualquier look",
    by: "category",
    value: "blazers",
    image: "/products/chaleco-yess.webp",
    badge: "bg-v3-lilac",
    bar: "bg-v3-lilac",
  },
  {
    key: "denim",
    name: "Denim",
    tagline: "El jean que te acompaña todo el día",
    by: "category",
    value: "full-denim",
    image: "/products/casaca-jean-love.webp",
    badge: "bg-v3-teal",
    bar: "bg-v3-teal",
  },
  {
    key: "nuevos-ingresos",
    name: "Nuevos ingresos",
    tagline: "Lo último que acaba de llegar",
    by: "collection",
    value: "nuevos-ingresos",
    image: "/products/cardigan-joy-rosa.webp",
    badge: "bg-v3-coral",
    bar: "bg-v3-coral",
  },
  {
    key: "vestidos",
    name: "Vestidos",
    tagline: "Frescos y femeninos para cada ocasión",
    by: "category",
    value: "vestidos",
    image: "/products/vestido-dreams-rosa.webp",
    badge: "bg-v3-primary",
    bar: "bg-v3-primary",
  },
];

export type ResolvedBlock = {
  block: HomeBlock;
  image: string; // foto real del bloque
  count: number; // cuantas prendas hay
  href: string; // a donde lleva al hacer clic
};

// Completa un bloque con datos reales del catalogo: la foto sale del
// primer producto que tenga imagen, y si la categoria todavia esta vacia
// se usa la foto de respaldo y el bloque se marca como "proximamente".
export function resolveBlock(
  products: Product[],
  block: HomeBlock
): ResolvedBlock {
  const items = products.filter((p) =>
    block.by === "category"
      ? p.category === block.value
      : (p.collections ?? []).includes(block.value)
  );
  const withPhoto = items.find((p) => p.image);
  return {
    block,
    image: withPhoto?.image ?? block.image,
    count: items.length,
    // una categoria vacia lleva a la tienda completa, no a una pagina en blanco
    href: items.length > 0 ? `/tienda?cat=${block.value}` : "/tienda",
  };
}

export function resolveBlocks(products: Product[]): ResolvedBlock[] {
  return homeBlocks.map((b) => resolveBlock(products, b));
}
