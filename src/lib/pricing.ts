// =============================================================
//  PRECIOS DEL SERVIDOR (fuente de verdad para el cobro)
//  Recalcula el precio real de cada producto a partir de la base de
//  datos + descuentos vigentes. NUNCA se confía en el precio que envía
//  el navegador (podría manipularse).
// =============================================================

import { getProductById } from "@/lib/store-data";
import { getLiveRules, priceFor } from "@/lib/promos-data";
import type { OrderItem } from "@/lib/types";

type IncomingItem = {
  productId: string;
  sku?: string;
  name?: string;
  size?: string;
  qty: number;
  price?: number; // lo ignoramos: lo recalculamos aquí
};

// Devuelve los items con el precio y nombre tomados del servidor.
// Si un producto ya no existe, se omite del pedido.
export async function priceForItems(
  incoming: IncomingItem[]
): Promise<OrderItem[]> {
  const liveRules = await getLiveRules();
  const items: OrderItem[] = [];
  for (const it of incoming) {
    const product = await getProductById(it.productId, { raw: true });
    if (!product) continue;
    const { price } = priceFor(product, liveRules);
    items.push({
      productId: product.id,
      sku: it.sku,
      name: product.name,
      size: it.size,
      price,
      qty: Math.max(1, Math.floor(it.qty)),
    });
  }
  return items;
}
