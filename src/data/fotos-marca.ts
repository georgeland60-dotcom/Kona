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

// ---- PORTADA (banners anchos de la marca, 1920 x 939) ----
// Son los banners que la propia Kona tiene publicados en konamoda.pe,
// bajados a su tamano original. Como vienen con su texto ya puesto,
// la pagina NO les encima ningun titulo: se veria sucio.
//
// Van en su formato nativo (casi 2:1) y sin recortar, para no cortar
// la tipografia que trae cada uno.
//
// OJO con el primero: anuncia "40% OFF". Para que lo prometido sea lo
// que el carrito cobra, tiene que existir esa regla activa en /admin.
// Si la campana termina, hay que sacar este banner de la lista o la
// web estara prometiendo un descuento que no se aplica.
//
// El ORDEN es el orden en que se ven.
export const fotosPortada: FotoMarca[] = [
  {
    // 1549 x 940. Es mas "cuadrada" que el marco, asi que se ancla
    // arriba: lo que se recorta es el borde de la piscina, no el
    // "swim SALE" ni el 40%.
    src: "/marca/hero-swimsale.webp",
    alt: "Dos clientas de Kona en ropa de baño azul con rosas: swim sale, 40% de descuento",
    position: "object-top",
  },
  {
    // 1534 x 940, mismo caso: anclada arriba para no comerse el
    // "love is a holiday".
    src: "/marca/hero-loveholiday.webp",
    alt: "Clienta de Kona con un conjunto rosa y rosas, con la frase “love is a holiday”",
    position: "object-top",
  },
  {
    src: "/marca/hero-bannerwebali.webp",
    alt: "Clienta de Kona en ropa de baño naranja junto a la piscina",
  },
  {
    src: "/marca/hero-bannerweb.webp",
    alt: "Dos clientas de Kona sonriendo en una terraza de Lima",
  },
  {
    src: "/marca/hero-portadaconjuntos-1.webp",
    alt: "Tres clientas de Kona juntas, con la frase “vive la moda con comodidad”",
  },
  {
    src: "/marca/hero-bannerswim1.webp",
    alt: "Clienta de Kona en una piscina, con la frase “Vivo orgullosa de mí”",
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
