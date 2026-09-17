// =============================================================
//  CONFIGURACION DE TU TIENDA
//  Este es el archivo mas importante para ti.
//  Cambia estos valores y toda la tienda se actualiza.
// =============================================================

export const store = {
  // Nombre de tu marca (aparece en el menu, titulo, etc.)
  name: "Kona Moda",
  tagline: "Moda femenina",

  // ⚠️ IMPORTANTE: tu numero de WhatsApp para recibir pedidos.
  // Formato: codigo de pais + numero, SIN el signo "+", SIN espacios.
  // Peru = 51. Ejemplo: 51987654321
  //
  // El 51987654321 de abajo es un numero DE EJEMPLO, no existe: si esta
  // puesto, el boton "Coordinar por WhatsApp" lleva a un numero
  // inexistente y se pierde la venta. Se cambia aqui, o sin tocar codigo
  // con la variable NEXT_PUBLIC_WHATSAPP.
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP || "51987654321",

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
  // siempre marcadas como tales. Ponlo en false si prefieres que, hasta
  // tener las reales, solo se remita a la tabla que va en las fotos de
  // la prenda: así nunca puede haber dos tablas distintas a la vez.
  medidasEstimadas: true,

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

  // Redes sociales. Los de abajo tambien son de ejemplo: llevan a la
  // portada de cada red, no a la cuenta de la tienda.
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM || "https://instagram.com/",
  facebook: process.env.NEXT_PUBLIC_FACEBOOK || "https://facebook.com/",

  // Texto del aviso superior (la barra delgada arriba del menu)
  announcement: "Envios a todo Lima · Pago seguro · Cambios hasta 7 dias",
};
