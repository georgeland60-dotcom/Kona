// =============================================================
//  MEDIR LO QUE PASA EN LA TIENDA (GA4 y Pixel de Meta)
//
//  Una sola función para los tres momentos que importan para vender y
//  para los anuncios: añadir al carrito, empezar a pagar y comprar.
//  Cada evento sale a los dos sitios a la vez con sus nombres propios,
//  para que nadie tenga que acordarse de que Google dice "add_to_cart"
//  y Meta "AddToCart".
//
//  Si los scripts no están cargados (falta el identificador, es una
//  copia de pruebas, o un bloqueador de anuncios los quitó), no hace
//  NADA y no rompe nada: medir nunca puede impedir que alguien compre.
// =============================================================

type Linea = {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  talla?: string;
};

type Evento =
  | { tipo: "carrito"; linea: Linea }
  | { tipo: "pagar"; lineas: Linea[]; total: number; metodo: string }
  | { tipo: "compra"; lineas: Linea[]; total: number; pedido: string };

type Ventana = Window & {
  fbq?: (...args: unknown[]) => void;
  gtag?: (...args: unknown[]) => void;
};

const MONEDA = "PEN";

export function medir(evento: Evento): void {
  if (typeof window === "undefined") return;
  const w = window as Ventana;

  const lineas = evento.tipo === "carrito" ? [evento.linea] : evento.lineas;
  const valor =
    evento.tipo === "carrito"
      ? evento.linea.precio * evento.linea.cantidad
      : evento.total;

  const paraGoogle = lineas.map((l) => ({
    item_id: l.id,
    item_name: l.nombre,
    price: l.precio,
    quantity: l.cantidad,
    ...(l.talla ? { item_variant: l.talla } : {}),
  }));

  const paraMeta = {
    currency: MONEDA,
    value: valor,
    content_type: "product",
    content_ids: lineas.map((l) => l.id),
    contents: lineas.map((l) => ({ id: l.id, quantity: l.cantidad })),
    num_items: lineas.reduce((s, l) => s + l.cantidad, 0),
  };

  try {
    if (evento.tipo === "carrito") {
      w.gtag?.("event", "add_to_cart", { currency: MONEDA, value: valor, items: paraGoogle });
      w.fbq?.("track", "AddToCart", paraMeta);
    } else if (evento.tipo === "pagar") {
      w.gtag?.("event", "begin_checkout", {
        currency: MONEDA,
        value: valor,
        payment_type: evento.metodo,
        items: paraGoogle,
      });
      w.fbq?.("track", "InitiateCheckout", paraMeta);
    } else {
      w.gtag?.("event", "purchase", {
        currency: MONEDA,
        value: valor,
        transaction_id: evento.pedido,
        items: paraGoogle,
      });
      // eventID: si Meta recibe la misma compra dos veces con el mismo
      // identificador, la cuenta una sola vez.
      w.fbq?.("track", "Purchase", paraMeta, { eventID: evento.pedido });
    }
  } catch {
    // Un script de terceros roto no puede tumbar el carrito.
  }
}
