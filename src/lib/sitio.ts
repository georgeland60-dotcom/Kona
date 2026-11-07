// =============================================================
//  LA DIRECCIÓN DE LA TIENDA
//
//  Una sola función para saber en qué dirección vive la tienda, porque
//  hay tres sitios que la necesitan y si cada uno la adivina por su
//  cuenta terminan discrepando: el cobro de Mercado Pago (a dónde
//  vuelve la clienta y a dónde avisa el pago), las etiquetas que lee
//  Google, y el sitemap.
//
//  Orden, de lo más fiable a lo menos:
//   1. NEXT_PUBLIC_SITE_URL — lo que se pone al conectar el dominio.
//      Es la que manda, y la única que hay que recordar cambiar.
//   2. VERCEL_PROJECT_PRODUCTION_URL — el dominio de producción que
//      Vercel conoce, para que una previsualización no se anuncie a
//      Google como si fuera la tienda.
//   3. localhost, para trabajar.
// =============================================================

export function urlDelSitio(): string {
  const puesta = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (puesta) return puesta.replace(/\/+$/, "");

  const deVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (deVercel) return `https://${deVercel.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

// ¿Esta copia es la tienda de verdad, o una previsualización?
//
// Importa para dos cosas: que Google no indexe una rama de pruebas, y
// que el sitemap no anuncie direcciones que mañana no existen.
export function esProduccion(): boolean {
  const entorno = process.env.VERCEL_ENV;
  return !entorno || entorno === "production";
}
