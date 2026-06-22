// =============================================================
//  BANNERS DEL SLIDER PRINCIPAL (parte de arriba del inicio)
//  Para cambiar un banner: edita el texto, el enlace y la imagen.
//  - "image": pon la foto en /public (o /public/products) y
//    escribe la ruta, ej "/products/bb2.webp" o "/banners/promo.jpg"
//  - "href": a dónde lleva el botón (una categoría o /tienda)
//  Cuando tengas tus banners promocionales (ej. SWIMSALE), solo
//  reemplaza la imagen y los textos aquí.
// =============================================================

export type Banner = {
  eyebrow: string;
  title: string;
  text: string;
  cta: string;
  href: string;
  image: string;
};

export const banners: Banner[] = [
  {
    eyebrow: "Nueva temporada",
    title: "Ropa de baño",
    text: "Disfruta el verano con nuestra colección Bali.",
    cta: "Ver colección",
    href: "/tienda?cat=ropa-de-bano",
    image: "/products/bb2.webp",
  },
  {
    eyebrow: "Lo nuevo",
    title: "Sets & Conjuntos",
    text: "Looks coordinados para verte increíble sin esfuerzo.",
    cta: "Descubrir",
    href: "/tienda?cat=conjuntos",
    image: "/products/setluz5.webp",
  },
  {
    eyebrow: "Sale",
    title: "Shorts Holiday",
    text: "Comodidad y estilo para todos tus días.",
    cta: "Comprar ahora",
    href: "/tienda?cat=shorts",
    image: "/products/HM5.png",
  },
];
