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
  const [productos, reglas] = await Promise.all([
    // En crudo: los precios base, sin descuentos ya aplicados. Si no,
    // el motor descontaría sobre un precio ya descontado.
    getProducts({ includeInactive: true, raw: true }),
    getRules(),
  ]);

  return preciarCarrito(
    incoming.map((i) => ({
      productId: i.productId,
      sku: i.sku,
      size: i.size,
      qty: Math.max(0, Math.floor(i.qty)),
    })),
    productos,
    reglas
  );
}

// Los items ya preciados, tal como se guardan en el pedido.
export async function priceForItems(
  incoming: IncomingItem[]
): Promise<OrderItem[]> {
  const { lineas } = await preciarPedido(incoming);
  return lineas.map((l) => ({
    productId: l.productId,
    sku: l.sku,
    name: l.nombre,
    size: l.size,
    price: l.precioUnitario,
    qty: l.qty,
  }));
}
