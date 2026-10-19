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

// La foto grande de arriba.
export const fotoPortada: FotoMarca = {
  src: "/marca/orgullosa.webp",
  alt: "Clienta de Kona en ropa de baño junto a la piscina, con la frase “Vivo orgullosa de mí”",
  position: "object-[70%_center]",
};

// La foto del banner del medio, para cortar tanto blanco.
export const fotoIntermedia: FotoMarca = {
  src: "/marca/selflove.webp",
  alt: "Clienta de Kona sonriendo con un vestido verde y flores, con la frase “self love”",
  position: "object-[center_30%]",
};

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
