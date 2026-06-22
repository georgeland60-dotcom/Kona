import { Category } from "@/lib/types";

// Las categorias de productos de tu tienda (replican el menu "PRODUCTOS"
// de konamoda.pe). El "slug" se usa en la URL y debe coincidir con el
// campo "category" de cada producto en products.ts
export const categories: Category[] = [
  { slug: "basicos", name: "Básicos" },
  { slug: "ropa-de-bano", name: "Ropa de baño" },
  { slug: "shorts", name: "Shorts" },
  { slug: "blusas", name: "Blusas" },
  { slug: "cafarenas", name: "Cafarenas" },
  { slug: "cardigans", name: "Cárdigans" },
  { slug: "chalecos", name: "Chalecos" },
  { slug: "chompas", name: "Chompas" },
  { slug: "full-denim", name: "Full Denim" },
  { slug: "joggers", name: "Joggers" },
  { slug: "pantalones", name: "Pantalones" },
  { slug: "conjuntos", name: "Set / Conjuntos" },
  { slug: "vestidos", name: "Vestidos" },
];
