// =============================================================
//  FOTOS DE MARCA DEL INICIO
//  Salen de las publicaciones de Instagram de Kona que vinieron en el
//  PDF de referencia, ya recortadas para quitarles los iconos.
//
//  REGLA QUE NO HAY QUE ROMPER: una foto nunca debe mostrarse mas
//  ancha de lo que mide, porque al estirarla se pixela. Por eso aqui
//  va anotado el tamano real de cada una, y por eso las columnas
//  donde viven estan limitadas en la pagina.
//
//  SEGUNDA REGLA: las verticales van en marcos verticales y las
//  horizontales en marcos horizontales. Mezclarlas en un mismo marco
//  es lo que hacia que salieran recortadas y raras.
//
//  Para cambiar una foto: dejala en /public/marca/ y cambia la ruta.
// =============================================================

export type FotoMarca = {
  src: string;
  alt: string;
  // Que parte de la foto no se puede recortar cuando cambia el tamano
  // de la pantalla (la cara, normalmente).
  position?: string;
};

// ---- PORTADA (marco vertical 4:5) ----
// El ORDEN es el orden en que se ven: la primera es la que abre.
//
// PENDIENTE: faltan las tres fotos anchas nuevas (las dos chicas, el
// corazon con las manos, la cebra horizontal). No llegaron como
// archivo. Cuando lleguen van al principio de esta lista, empezando
// por la de las dos chicas.
export const fotosPortada: FotoMarca[] = [
  {
    // 931 x 1236
    src: "/marca/selflove.webp",
    alt: "Clienta de Kona sonriendo con flores, con la frase “self love”",
    position: "object-[center_20%]",
  },
  {
    // 837 x 1180
    src: "/marca/lista.webp",
    alt: "Clienta de Kona de espaldas con cartera floral, con la frase “es estar siempre lista para vivir”",
    position: "object-[center_30%]",
  },
  {
    // 835 x 1187
    src: "/marca/elegir.webp",
    alt: "Perchero con prendas de Kona en tonos pastel, con la frase “es poder elegir”",
    position: "object-[center_40%]",
  },
];

// ---- BANNER DEL MEDIO (marco horizontal 3:2) ----
// Es la unica foto horizontal que tenemos, asi que va sola y en un
// marco de su mismo formato. Antes estaba a todo lo ancho de la
// pantalla, estirada casi al triple, y por eso se veia pixelada.
export const fotoIntermedia: FotoMarca = {
  // 1015 x 665
  src: "/marca/orgullosa.webp",
  alt: "Clienta de Kona en ropa de baño junto a la piscina, con la frase “Vivo orgullosa de mí”",
  position: "object-[62%_center]",
};

// ---- TESTIMONIOS (marco vertical 4:5) ----
// Son verticales (1015 x ~1295), asi que el marco tambien lo es.
export const fotosTestimonios: Record<string, FotoMarca> = {
  T1: {
    src: "/marca/testi-negro.webp",
    alt: "Clienta de Kona con ropa de baño negra",
    position: "object-[center_20%]",
  },
  T2: {
    src: "/marca/testi-azul.webp",
    alt: "Clienta de Kona con ropa de baño azul en el agua",
    position: "object-[center_25%]",
  },
};
