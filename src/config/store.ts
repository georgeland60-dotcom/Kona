// =============================================================
//  CONFIGURACION DE TU TIENDA
//  Este es el archivo mas importante para ti.
//  Cambia estos valores y toda la tienda se actualiza.
// =============================================================

export const store = {
  // Nombre de tu marca (aparece en el menu, titulo, etc.)
  name: "Kona Moda",
  tagline: "Moda femenina",

  // El WhatsApp del negocio: aqui llegan los pedidos por transferencia,
  // Yape y Plin, y los comprobantes de pago.
  // Formato: codigo de pais + numero, SIN el signo "+", SIN espacios.
  //
  // +51 942 187 981 es el que usaba el boton de la tienda anterior,
  // confirmado el 8 nov 2026. La variable NEXT_PUBLIC_WHATSAPP lo
  // reemplaza sin tocar codigo, si algun dia cambia (y hay que volver a
  // desplegar: se incrusta al construir).
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP || "51942187981",

  // Referencia de las modelos de las fotos, para ayudar con la talla.
  //
  // Es lo que se usa MIENTRAS una prenda no traiga la suya: cada producto
  // puede llevar la talla y las medidas exactas de quien posa, y esas
  // mandan. Esto es el "en general" de la tienda, y se dice como tal.
  modeloReferencia: {
    talla: "M",
    altura: 168, // cm
  },

  // ¿Mostrar medidas ESTIMADAS cuando una prenda no tiene las suyas
  // cargadas? En true salen unas de referencia calculadas por categoría,
  // siempre marcadas como tales.
  //
  // Está en FALSE desde que se transcribieron las guías de tallas de
  // las fotos (src/data/guias-tallas.ts): de las 84 prendas, las que
  // tienen guía publicada ya enseñan sus medidas de verdad, y a las
  // otras quince es mejor decirles "las medidas están en las fotos, o
  // te las medimos por WhatsApp" que enseñarles unos centímetros
  // calculados. Una medida inventada en la pantalla donde se decide la
  // compra termina en una devolución.
  medidasEstimadas: false,

  // ¿Decir qué talla lleva la modelo aunque esa prenda no traiga el dato
  // cargado? En true se usa la talla de referencia de arriba traducida a
  // la escala de cada prenda (en un jean que va del 28 al 34, la "M"
  // equivale a la 30), para que ninguna ficha se quede sin referencia
  // mientras se cargan las reales.
  //
  // OJO: mientras esté en true, esa talla es una ESTIMACIÓN, no un dato
  // de esa foto. Es útil para probar; en cuanto cada prenda tenga su
  // modeloFoto cargada, esto se puede poner en false y solo se dirá lo
  // que de verdad se sabe.
  tallaModeloEstimada: true,

  // Moneda
  currency: "PEN",
  currencySymbol: "S/",

  // Redes sociales. Instagram ya apunta a la cuenta real de Kona.
  // Facebook sigue siendo de ejemplo: lleva a la portada de la red.
  instagram:
    process.env.NEXT_PUBLIC_INSTAGRAM || "https://www.instagram.com/konamoda.pe/",
  instagramHandle: process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE || "@konamoda.pe",
  facebook: process.env.NEXT_PUBLIC_FACEBOOK || "https://facebook.com/",

  // Texto del aviso superior (la barra delgada arriba del menu)
  announcement: "Envios a todo Lima · Pago seguro · Cambios hasta 7 dias",
};
