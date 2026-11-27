import type { DiscountRule } from "@/lib/types";

// =============================================================
//  CAMPAÑA DE PORTADA
//  Un banner de campaña (Black Friday, Cyber, Día de la Madre...)
//  que reemplaza a la portada normal mientras dura.
//
//  Por qué está atado a los descuentos: estos banners llevan el
//  porcentaje DIBUJADO en la imagen. Una imagen no se apaga sola, y ya
//  pasó una vez: un "40% OFF" se quedó en la portada sin ningún
//  descuento detrás. Por eso cada campaña dice qué tiene que estar
//  vigente para mostrarse; en cuanto el descuento termina (por fecha o
//  porque alguien lo apaga), la portada vuelve sola a la normal.
//
//  Para una campaña nueva: imágenes en public/campanas/, una entrada
//  aquí y su condición. Para quitarla: campana = null.
// =============================================================

export type ImagenCampana = { src: string; ancho: number; alto: number };

export type Campana = {
  nombre: string;
  escritorio: ImagenCampana;
  celular: ImagenCampana;
  // TODO el texto que lleva la imagen dibujado: para quien no la ve
  // (lector de pantalla, imagen que no carga) es el único anuncio.
  alt: string;
  href: string;
  // ¿Está vigente lo que la imagen promete?
  vigente: (reglas: DiscountRule[]) => boolean;
};

// Una regla de % que vale para toda la tienda (con o sin excepciones).
function esDeTodaLaTienda(r: DiscountRule): boolean {
  return r.filtro ? r.filtro.todos === true : r.scope === "all";
}

// Que baje el precio en la vitrina: ni un 2x1 ni un descuento del total
// cuentan como "50% OFF en toda la web".
function esDirecto(r: DiscountRule): boolean {
  return (r.tipo ?? "simple") === "simple" && r.kind === "percent";
}

export const campana: Campana | null = {
  nombre: "Black Friday 2026",
  escritorio: {
    src: "/campanas/black-friday-escritorio.webp",
    ancho: 1920,
    alto: 940,
  },
  celular: {
    src: "/campanas/black-friday-celular.webp",
    ancho: 1080,
    alto: 1350,
  },
  alt:
    "Black Friday en Kona: 50% de descuento en toda la web, " +
    "y 35% en blazers y ropa de baño entera. Comprar ahora.",
  href: "/tienda",
  // El banner promete las dos cosas, así que exige las dos: un 50% para
  // toda la tienda y un 35% para lo que va aparte.
  vigente: (reglas) =>
    reglas.some((r) => esDirecto(r) && esDeTodaLaTienda(r) && r.value >= 50) &&
    reglas.some((r) => esDirecto(r) && !esDeTodaLaTienda(r) && r.value >= 35),
};
