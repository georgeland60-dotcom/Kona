// =============================================================
//  TESTIMONIOS DE CLIENTAS
//  Mensajes REALES que las clientas enviaron por WhatsApp y que
//  Kona publico en Instagram. Estan transcritos tal cual.
//
//  Importante: no llevan nombre ni foto de la clienta porque en los
//  posts originales tampoco aparecen, y poner un nombre inventado
//  seria un testimonio falso. Cuando tengas la autorizacion de cada
//  clienta, agrega "nombre" (y "foto" si la hay) y se muestran solos.
// =============================================================

export type Testimonio = {
  id: string;
  texto: string;
  // Opcionales: solo se muestran si existen de verdad.
  nombre?: string;
  foto?: string; // ej "/testimonios/lorena.webp"
  prenda?: string; // de que prenda hablaba
  fuente?: string; // enlace al post de Instagram
};

export const testimonios: Testimonio[] = [
  {
    id: "T1",
    texto:
      "No es solo una ropa de baño. Ha llegado justo en un momento complicado, donde no me sentía muy bien con nada. Pero me la probé y te aseguro que ninguna otra ropa de baño me ha quedado tan bien y me hace sentir aún mejor. En serio muchas gracias.",
    prenda: "Ropa de baño",
    fuente: "https://www.instagram.com/p/DTrFM6pjR4o/",
  },
  {
    id: "T2",
    texto:
      "Cuando la recibí fue increíble, la suavidad de la lycra me impactó. Vale cada sol, es muy cómoda y se siente de alta calidad. Ya tengo 4 colores.",
    prenda: "Ropa de baño",
    fuente: "https://www.instagram.com/p/DT5kBgpjrMY/",
  },
  {
    id: "T3",
    texto:
      "Cuando compré la ropa de baño por primera vez fue principalmente por la talla, pues no es muy usual encontrar una ropa de baño bonita en XL.",
    prenda: "Ropa de baño",
    fuente: "https://www.instagram.com/p/DT5kBgpjrMY/",
  },
];
