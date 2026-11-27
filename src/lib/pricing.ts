// =============================================================
//  PRECIOS DEL SERVIDOR (fuente de verdad para el cobro)
//
//  Recalcula el precio real a partir de la base de datos + las
//  promociones vigentes. NUNCA se confía en el precio que envía el
//  navegador: podría manipularse.
//
//  Ojo con esto: el carrito de la tienda y el cobro usan LA MISMA
//  función. No dos parecidas. Es lo único que garantiza que no se
//  muestre un precio y se cobre otro.
// =============================================================

import { getProducts } from "@/lib/store-data";
import { getRules } from "@/lib/promos-data";
import { liberarAbandonados } from "@/lib/orders-data";
import { preciarCarrito, type CarritoPreciado } from "@/lib/promo-engine";
import type { OrderItem } from "@/lib/types";

type IncomingItem = {
  productId: string;
  sku?: string;
  name?: string;
  size?: string;
  qty: number;
  price?: number; // lo ignoramos: lo recalculamos aquí
};

// Precia un carrito con los datos reales de la tienda.
export async function preciarPedido(
  incoming: IncomingItem[]
): Promise<CarritoPreciado> {
  // Antes de mirar el stock, se suelta lo que quedó reservado por
  // pedidos abandonados. Si no, esas unidades no se verían libres nunca:
  // nadie podría comprarlas, y por tanto nadie dispararía su liberación.
  await liberarAbandonados();

  const [productos, reglas] = await Promise.all([
    // En crudo: los precios base, sin descuentos ya aplicados. Si no,
    // el motor descontaría sobre un precio ya descontado.
    getProducts({ includeInactive: true, raw: true }),
    getRules(),
  ]);

  return preciarCarrito(
    incoming.map((i) => {
      // Una prenda de talla única que llegó sin talla (carritos viejos):
      // no hay duda de cuál es, se completa.
      const variantes = productos.find((p) => p.id === i.productId)?.variants ?? [];
      const unica = !i.sku && variantes.length === 1 ? variantes[0] : undefined;
      return {
        productId: i.productId,
        sku: unica?.sku ?? i.sku,
        size: unica?.size ?? i.size,
        qty: Math.max(0, Math.floor(i.qty)),
      };
    }),
    productos,
    reglas
  );
}

// Los items ya preciados, tal como se guardan en el pedido.
//
// Ojo con los 2x1: dentro de una misma línea las unidades cuestan distinto
// (una a S/ 115 y la regalada a S/ 0). Guardar un único precio unitario
// cobraría de menos, así que la línea se parte en un item por cada precio.
// De paso el pedido queda como una boleta de verdad: se ve qué se pagó y
// qué se regaló.
//
// Se usan los "preciosFinales": los que ya traen repartido el descuento
// de carrito (el que baja el total, no el producto). El pedido y Mercado
// Pago cobran por unidad y no admiten una línea negativa de descuento,
// así que el motor lo reparte y aquí solo se cobra lo repartido. El total
// del pedido termina siendo exactamente el que vio la clienta.
export async function priceForItems(
  incoming: IncomingItem[]
): Promise<OrderItem[]> {
  const { lineas } = await preciarPedido(incoming);
  return aItems(lineas);
}

// Los items del pedido Y si el envío sale gratis, en UNA sola pasada.
// Lo usan el pedido y el cobro: preciar dos veces costaría dos lecturas
// de la base y, peor, abriría la puerta a que cada uno viera cosas
// distintas.
export async function preciarParaPedido(incoming: IncomingItem[]): Promise<{
  items: OrderItem[];
  envioGratis?: { nombre: string; destinos?: string[] };
  // Prendas de varias tallas que llegaron sin talla. Con una sola, el
  // pedido no se crea: no se sabría qué entregar ni qué unidad apartar.
  sinTalla: string[];
}> {
  const carrito = await preciarPedido(incoming);
  const items = aItems(carrito.lineas);
  const sinTalla = [...new Set(items.filter((i) => !i.sku).map((i) => i.name))];
  return {
    items,
    sinTalla,
    ...(carrito.envioGratis ? { envioGratis: carrito.envioGratis } : {}),
  };
}

function aItems(lineas: CarritoPreciado["lineas"]): OrderItem[] {
  const items: OrderItem[] = [];

  for (const l of lineas) {
    const porPrecio = new Map<number, number>();
    for (const precio of l.preciosFinales) {
      porPrecio.set(precio, (porPrecio.get(precio) ?? 0) + 1);
    }
    for (const [price, qty] of [...porPrecio.entries()].sort((a, b) => b[0] - a[0])) {
      items.push({
        productId: l.productId,
        sku: l.sku,
        name: price === 0 ? `${l.nombre} (regalo)` : l.nombre,
        size: l.size,
        price,
        ...(l.precioLista > price ? { priceLista: l.precioLista } : {}),
        qty,
      });
    }
  }
  return items;
}
