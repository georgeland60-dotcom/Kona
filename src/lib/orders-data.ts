// =============================================================
//  CAPA DE DATOS DE PEDIDOS (ventas)
//  Guarda los pedidos en el documento "orders". Dónde acaban (base KV
//  o disco local) lo decide lib/kv.ts.
//  Al marcar un pedido como "pagado" se descuenta el stock.
// =============================================================

import type { Order, OrderItem, OrderStatus } from "@/lib/types";
import { adjustStock } from "@/lib/store-data";
import { readDoc, writeDoc } from "@/lib/kv";

type OrdersData = {
  orders: Order[];
  seq: number; // contador para numerar pedidos
};

async function readOrders(): Promise<OrdersData> {
  return readDoc<OrdersData>("orders", () => ({ orders: [], seq: 0 }));
}

// Devuelve false si no se pudo guardar (disco de solo lectura y sin KV).
async function writeOrders(data: OrdersData): Promise<boolean> {
  return writeDoc("orders", data);
}

function makeId(seq: number): string {
  return `PED-${String(seq).padStart(4, "0")}`;
}

// Crea un pedido nuevo (estado inicial "pendiente" salvo que se indique otro).
export async function createOrder(input: {
  items: OrderItem[];
  total: number;
  method: Order["method"];
  status?: OrderStatus;
  customer?: Order["customer"];
}): Promise<Order> {
  const data = await readOrders();
  data.seq += 1;
  const order: Order = {
    id: makeId(data.seq),
    createdAt: new Date().toISOString(),
    items: input.items,
    total: input.total,
    method: input.method,
    status: input.status ?? "pendiente",
    customer: input.customer,
    stockApplied: false,
  };
  data.orders.push(order);
  await writeOrders(data);
  return order;
}

export async function getOrders(opts?: {
  status?: OrderStatus;
}): Promise<Order[]> {
  const { orders } = await readOrders();
  const list = opts?.status
    ? orders.filter((o) => o.status === opts.status)
    : orders;
  // Más recientes primero.
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getOrderById(id: string): Promise<Order | undefined> {
  const { orders } = await readOrders();
  return orders.find((o) => o.id === id);
}

// Descuenta del inventario las unidades de un pedido (una sola vez).
async function applyStock(order: Order): Promise<void> {
  if (order.stockApplied) return;
  for (const item of order.items) {
    if (item.sku) await adjustStock(item.productId, item.sku, -item.qty);
  }
}

// Cambia el estado de un pedido. Si pasa a "pagado", descuenta stock.
export async function setOrderStatus(
  id: string,
  status: OrderStatus,
  extra?: { mpPaymentId?: string }
): Promise<Order | undefined> {
  const data = await readOrders();
  const order = data.orders.find((o) => o.id === id);
  if (!order) return undefined;

  if (status === "pagado" && !order.stockApplied) {
    await applyStock(order);
    order.stockApplied = true;
  }
  order.status = status;
  if (extra?.mpPaymentId) order.mpPaymentId = extra.mpPaymentId;

  await writeOrders(data);
  return order;
}

// ---- Métricas derivadas para el dashboard ---------------------------

export type SalesSummary = {
  ingresos: number; // suma de totales de pedidos pagados
  ventas: number; // nº de pedidos pagados
  unidades: number; // unidades vendidas (pagadas)
  pendientes: number; // nº de pedidos pendientes
  ingresosMes: number; // ingresos del mes actual
};

export async function getSalesSummary(): Promise<SalesSummary> {
  const { orders } = await readOrders();
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  let ingresos = 0;
  let ventas = 0;
  let unidades = 0;
  let pendientes = 0;
  let ingresosMes = 0;

  for (const o of orders) {
    if (o.status === "pagado") {
      ingresos += o.total;
      ventas += 1;
      unidades += o.items.reduce((s, i) => s + i.qty, 0);
      if (o.createdAt.startsWith(ym)) ingresosMes += o.total;
    } else if (o.status === "pendiente") {
      pendientes += 1;
    }
  }
  return { ingresos, ventas, unidades, pendientes, ingresosMes };
}

// Productos más vendidos (por unidades pagadas).
export async function getTopProducts(
  limit = 5
): Promise<{ name: string; productId: string; unidades: number; ingresos: number }[]> {
  const { orders } = await readOrders();
  const map = new Map<
    string,
    { name: string; productId: string; unidades: number; ingresos: number }
  >();
  for (const o of orders) {
    if (o.status !== "pagado") continue;
    for (const i of o.items) {
      const cur = map.get(i.productId) || {
        name: i.name,
        productId: i.productId,
        unidades: 0,
        ingresos: 0,
      };
      cur.unidades += i.qty;
      cur.ingresos += i.price * i.qty;
      map.set(i.productId, cur);
    }
  }
  return [...map.values()]
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, limit);
}
