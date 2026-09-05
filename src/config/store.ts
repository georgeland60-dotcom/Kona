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
