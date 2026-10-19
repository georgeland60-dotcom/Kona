// =============================================================
//  FOTOS DE MARCA DEL INICIO
//  Salen de las publicaciones de Instagram de Kona que vinieron en el
//  PDF de referencia (las de "Vivo orgullosa de mi" y "self love"), ya
//  recortadas para quitarles los iconos de Instagram.
//
//  Para cambiar una foto, deja el archivo nuevo en /public/marca/ y
//  cambia la ruta aqui. No hace falta tocar la maquetacion.
// =============================================================

export type FotoMarca = {
  src: string;
  alt: string;
  // Que parte de la foto no se puede recortar cuando cambia el tamano
  // de la pantalla (la cara, normalmente).
  position?: string;
};

// ---- LAS FOTOS QUE ROTAN EN LA PORTADA ----
// El ORDEN de esta lista es el orden en que se ven: la primera es la
// que aparece al abrir la pagina.
//
// PENDIENTE: faltan las tres fotos anchas nuevas (la de las dos chicas,
// la del corazon con las manos y la de la cebra en horizontal). Cuando
// lleguen, se dejan en /public/marca/ y se ponen aqui arriba del todo,
// empezando por la de las dos chicas. Mientras tanto rotan estas, que
// son las que ya estaban.
export const fotosPortada: FotoMarca[] = [
  {
    src: "/marca/orgullosa.webp",
    alt: "Clienta de Kona en ropa de baño junto a la piscina, con la frase “Vivo orgullosa de mí”",
    position: "object-[70%_center]",
  },
  {
    src: "/marca/selflove.webp",
    alt: "Clienta de Kona sonriendo con flores, con la frase “self love”",
    position: "object-[center_25%]",
  },
  {
    src: "/marca/lista.webp",
    alt: "Clienta de Kona de espaldas con cartera floral, con la frase “es estar siempre lista para vivir”",
    position: "object-[center_30%]",
  },
];

// La foto del banner del medio, para cortar tanto blanco.
export const fotoIntermedia: FotoMarca = {
  src: "/marca/selflove.webp",
  alt: "Clienta de Kona sonriendo con un vestido verde y flores, con la frase “self love”",
  position: "object-[center_30%]",
};

// Las dos fotos que continuan la frase de "self love": juntas se leen
// como una secuencia ("es poder elegir..." / "...es estar siempre lista
// para vivir"). Por eso van en ese orden y no sueltas.
export const fotosHistoria: FotoMarca[] = [
  {
    src: "/marca/selflove.webp",
    alt: "Clienta de Kona sonriendo con flores, con la frase “self love”",
  },
  {
    src: "/marca/elegir.webp",
    alt: "Perchero con prendas de Kona en tonos pastel, con la frase “es poder elegir”",
  },
  {
    src: "/marca/lista.webp",
    alt: "Clienta de Kona de espaldas con cartera floral, con la frase “es estar siempre lista para vivir”",
  },
];

// Fotos que acompañan los testimonios.
export const fotosTestimonios: Record<string, FotoMarca> = {
  T1: {
    src: "/marca/testi-negro.webp",
    alt: "Clienta de Kona con ropa de baño negra",
    position: "object-[center_25%]",
  },
  T2: {
    src: "/marca/testi-azul.webp",
    alt: "Clienta de Kona con ropa de baño azul en el agua",
    position: "object-[center_30%]",
  },
};
