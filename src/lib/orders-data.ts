// =============================================================
//  CAPA DE DATOS DE PEDIDOS (ventas)
//  Guarda los pedidos en el documento "orders". Dónde acaban (base KV
//  o disco local) lo decide lib/kv.ts.
//  El stock se RESERVA al crear el pedido, no al pagarlo: si se esperara
//  al pago, dos clientas podrían comprar la última unidad a la vez y las
//  dos se irían convencidas de que la tienen. Lo que se reserva y no se
//  paga se suelta solo pasado un tiempo.
// =============================================================

import type { Order, OrderItem, OrderStatus } from "@/lib/types";
import {
  descontarStock,
  devolverStock,
  type Faltante,
} from "@/lib/store-data";
import { conCandado, readDoc, writeDoc } from "@/lib/kv";

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

// Cuánto aguanta un pedido sin pagar antes de soltar lo que tenía
// reservado. Quien fue a pagar con tarjeta y no volvió, no vuelve; el de
// WhatsApp se está coordinando por chat y merece más margen.
const CADUCA_MS: Record<Order["method"], number> = {
  mercadopago: 45 * 60 * 1000,
  whatsapp: 24 * 60 * 60 * 1000,
};

// ¿Hay algo reservado que ya caducó?
function hayAbandonados(orders: Order[]): boolean {
  const ahora = Date.now();
  return orders.some(
    (o) =>
      o.status === "pendiente" &&
      o.stockApplied &&
      ahora - new Date(o.createdAt).getTime() >=
        (CADUCA_MS[o.method] ?? CADUCA_MS.whatsapp)
  );
}

// Suelta lo reservado por pedidos que llevan demasiado tiempo esperando.
//
// Se llama desde donde se MIRA el stock (al preciar el carrito), no solo
// desde donde se descuenta: si solo se limpiara al crear un pedido, las
// unidades abandonadas no se verían disponibles y nadie podría llegar a
// crear el pedido que las liberaría. Se quedarían atascadas para siempre.
export async function liberarAbandonados(): Promise<void> {
  const { orders } = await readOrders();
  if (!hayAbandonados(orders)) return; // lo normal: no se escribe nada

  await conCandado("stock", async () => {
    const data = await readOrders();
    await soltarAbandonados(data);
    await writeOrders(data);
  });
}

async function soltarAbandonados(data: OrdersData): Promise<void> {
  const ahora = Date.now();

  for (const pedido of data.orders) {
    if (pedido.status !== "pendiente" || !pedido.stockApplied) continue;
    const limite = CADUCA_MS[pedido.method] ?? CADUCA_MS.whatsapp;
    if (ahora - new Date(pedido.createdAt).getTime() < limite) continue;

    await devolverStock(pedido.items);
    pedido.stockApplied = false;
    pedido.stockLiberado = new Date().toISOString();
  }
}

export type ResultadoPedido =
  | { ok: true; order: Order }
  | { ok: false; faltantes: Faltante[] };

// Crea un pedido nuevo y le RESERVA el stock.
//
// Todo dentro de un candado: comprobar si hay, descontar y guardar tiene
// que ser una sola cosa indivisible. Si no, dos compras simultáneas de la
// última unidad leen las dos "queda 1" y las dos creen habérsela llevado.
export async function createOrder(input: {
  items: OrderItem[];
  total: number;
  method: Order["method"];
  status?: OrderStatus;
  customer?: Order["customer"];
}): Promise<ResultadoPedido> {
  return conCandado("stock", async () => {
    const data = await readOrders();
    await soltarAbandonados(data);

    // Los regalos de un 2x1 van a precio 0 pero también salen del
    // almacén: se reserva por unidades, no por lo que se cobra.
    const reserva = await descontarStock(input.items);
    if (!reserva.ok) {
      // Aunque no se cree el pedido, lo soltado por caducidad sí se
      // guarda: ese stock ya volvió al inventario.
      await writeOrders(data);
      return { ok: false, faltantes: reserva.faltantes };
    }

    data.seq += 1;
    const order: Order = {
      id: makeId(data.seq),
      createdAt: new Date().toISOString(),
      items: input.items,
      total: input.total,
      method: input.method,
      status: input.status ?? "pendiente",
      customer: input.customer,
      stockApplied: true,
    };
    data.orders.push(order);
    await writeOrders(data);
    return { ok: true, order };
  });
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

// Cambia el estado de un pedido, moviendo el stock según corresponda:
//  - cancelado: lo reservado vuelve al inventario.
//  - pagado: ya estaba reservado desde que se creó; solo se vuelve a
//    descontar si se había soltado por caducidad.
export async function setOrderStatus(
  id: string,
  status: OrderStatus,
  extra?: { mpPaymentId?: string }
): Promise<Order | undefined> {
  return conCandado("stock", async () => {
    const data = await readOrders();
    const order = data.orders.find((o) => o.id === id);
    if (!order) return undefined;

    if (status === "cancelado" && order.stockApplied) {
      await devolverStock(order.items);
      order.stockApplied = false;
    }

    if (status === "pagado" && !order.stockApplied) {
      // Se había soltado por caducidad y la clienta pagó igual. Se
      // descuenta lo que se pueda: si otra se llevó la última unidad
      // mientras tanto, queda en cero y hay que hablarlo con ella.
      await descontarStock(order.items);
      order.stockApplied = true;
    }

    order.status = status;
    if (extra?.mpPaymentId) order.mpPaymentId = extra.mpPaymentId;

    await writeOrders(data);
    return order;
  });
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
