import { SeedProduct } from "@/lib/types";

// =============================================================
//  TUS PRODUCTOS (datos reales tomados de konamoda.pe)
//  Para agregar uno nuevo, copia un bloque { ... } y cambialo.
//  - "image": pon la foto en /public/products y escribe
//    "/products/nombre-archivo.webp"
//  - "category": debe ser un slug que exista en categories.ts
// =============================================================

export const products: SeedProduct[] = [
  {
    id: "1",
    slug: "ropa-bano-bali-azul",
    name: "Ropa de baño Bali azul",
    price: 329,
    category: "ropa-de-bano",
    image: "/products/bb2.webp",
    description: "Ropa de baño Bali en tono azul. Tela de secado rápido.",
    sizes: ["S", "M", "L"],
    featured: true,
  },
  {
    id: "2",
    slug: "ropa-bano-bali-negra",
    name: "Ropa de baño Bali Negra",
    price: 329,
    category: "ropa-de-bano",
    image: "/products/Balin1.webp",
    description: "Ropa de baño Bali en negro. Diseño clásico y elegante.",
    sizes: ["S", "M", "L"],
    featured: true,
  },
  {
    id: "3",
    slug: "shorts-holiday-moca",
    name: "Shorts Holiday Moca",
    price: 129,
    category: "shorts",
    image: "/products/HM5.png",
    description: "Shorts Holiday en tono moca. Cómodos y versátiles.",
    sizes: ["S", "M", "L"],
    featured: true,
  },
  {
    id: "4",
    slug: "shorts-holiday-vainilla",
    name: "Shorts Holiday Vainilla",
    price: 129,
    category: "shorts",
    image: "/products/SH5.webp",
    description: "Shorts Holiday en tono vainilla. Cómodos y versátiles.",
    sizes: ["S", "M", "L"],
    featured: true,
  },
  {
    id: "5",
    slug: "set-luz-negro",
    name: "Set Luz Negro",
    price: 139,
    category: "conjuntos",
    image: "/products/setluz5.webp",
    description: "Conjunto Set Luz en negro. Look coordinado top + prenda.",
    sizes: ["S", "M", "L"],
    featured: true,
  },
  {
    id: "6",
    slug: "set-luz-pistacho",
    name: "Set Luz Pistacho",
    price: 139,
    category: "conjuntos",
    image: "/products/setluzv.webp",
    description: "Conjunto Set Luz en tono pistacho. Look coordinado.",
    sizes: ["S", "M", "L"],
    featured: true,
  },
  {
    id: "7",
    slug: "dress-pams-verde-pastel",
    name: "Dress Pams Verde pastel",
    price: 115,
    category: "vestidos",
    image: "/products/v2.png",
    description: "Vestido Pams en verde pastel. Fresco y femenino.",
    sizes: ["S", "M", "L"],
    featured: true,
  },
  {
    id: "8",
    slug: "cardigan-ceci-rosa",
    name: "Cárdigan Ceci Rosa",
    price: 85,
    category: "cardigans",
    image: "/products/cceci8.png",
    description: "Cárdigan Ceci en rosa. Tejido suave para abrigarte con estilo.",
    sizes: ["S", "M", "L"],
    featured: true,
  },
];
