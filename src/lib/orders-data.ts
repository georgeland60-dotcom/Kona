// =============================================================
//  CAPA DE DATOS DE PEDIDOS (ventas)
//  Ahora usa SQLite (ver src/lib/db.ts). Al marcar un pedido como
//  "pagado" se descuenta el stock DENTRO DE UNA TRANSACCIÓN: o se
//  hacen ambas cosas (marcar pagado + descontar) o ninguna. Así dos
//  compras simultáneas no pueden pisarse ni dejar el stock inconsistente.
//  Es idempotente: llamarlo dos veces no descuenta stock dos veces.
// =============================================================

import type { Order, OrderItem, OrderStatus } from "@/lib/types";
import { getDb, getMeta, setMeta } from "@/lib/db";

function makeId(seq: number): string {
  return `PED-${String(seq).padStart(4, "0")}`;
}

// ---- Filas de la base -> objeto Order -------------------------------

type OrderRow = {
  id: string;
  seq: number;
  createdAt: string;
  total: number;
  method: Order["method"];
  status: OrderStatus;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  stockApplied: number;
  mpPaymentId: string | null;
};

type ItemRow = {
  order_id: string;
  productId: string;
  sku: string | null;
  name: string;
  size: string | null;
  price: number;
  qty: number;
};

function rowToOrder(row: OrderRow, items: OrderItem[]): Order {
  const order: Order = {
    id: row.id,
    createdAt: row.createdAt,
    items,
    total: row.total,
    method: row.method,
    status: row.status,
    stockApplied: row.stockApplied === 1,
  };
  if (row.customer_name || row.customer_phone || row.customer_email) {
    order.customer = {};
    if (row.customer_name) order.customer.name = row.customer_name;
    if (row.customer_phone) order.customer.phone = row.customer_phone;
    if (row.customer_email) order.customer.email = row.customer_email;
  }
  if (row.mpPaymentId) order.mpPaymentId = row.mpPaymentId;
  return order;
}

function itemsFor(orderId: string): OrderItem[] {
  const rows = getDb()
    .prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY id")
    .all(orderId) as ItemRow[];
  return rows.map((r) => {
    const item: OrderItem = {
      productId: r.productId,
      name: r.name,
      price: r.price,
      qty: r.qty,
    };
    if (r.sku != null) item.sku = r.sku;
    if (r.size != null) item.size = r.size;
    return item;
  });
}

// ---- Crear pedido ----------------------------------------------------

// Crea un pedido nuevo (estado inicial "pendiente" salvo que se indique otro).
export async function createOrder(input: {
  items: OrderItem[];
  total: number;
  method: Order["method"];
  status?: OrderStatus;
  customer?: Order["customer"];
}): Promise<Order> {
  const db = getDb();

  const create = db.transaction((): Order => {
    const seq = Number(getMeta(db, "order_seq") ?? "0") + 1;
    setMeta(db, "order_seq", String(seq));

    const order: Order = {
      id: makeId(seq),
      createdAt: new Date().toISOString(),
      items: input.items,
      total: input.total,
      method: input.method,
      status: input.status ?? "pendiente",
      customer: input.customer,
      stockApplied: false,
    };

    db.prepare(
      `INSERT INTO orders
        (id, seq, createdAt, total, method, status,
         customer_name, customer_phone, customer_email, stockApplied, mpPaymentId)
       VALUES
        (@id, @seq, @createdAt, @total, @method, @status,
         @customer_name, @customer_phone, @customer_email, 0, NULL)`
    ).run({
      id: order.id,
      seq,
      createdAt: order.createdAt,
      total: order.total,
      method: order.method,
      status: order.status,
      customer_name: input.customer?.name ?? null,
      customer_phone: input.customer?.phone ?? null,
      customer_email: input.customer?.email ?? null,
    });

    const insItem = db.prepare(
      `INSERT INTO order_items (order_id, productId, sku, name, size, price, qty)
       VALUES (@order_id, @productId, @sku, @name, @size, @price, @qty)`
    );
    for (const it of input.items) {
      insItem.run({
        order_id: order.id,
        productId: it.productId,
        sku: it.sku ?? null,
        name: it.name,
        size: it.size ?? null,
        price: it.price,
        qty: it.qty,
      });
    }
    return order;
  });

  return create();
}

// ---- Lectura ---------------------------------------------------------

export async function getOrders(opts?: {
  status?: OrderStatus;
}): Promise<Order[]> {
  const db = getDb();
  const rows = (
    opts?.status
      ? db
          .prepare("SELECT * FROM orders WHERE status = ? ORDER BY createdAt DESC")
          .all(opts.status)
      : db.prepare("SELECT * FROM orders ORDER BY createdAt DESC").all()
  ) as OrderRow[];
  return rows.map((r) => rowToOrder(r, itemsFor(r.id)));
}

export async function getOrderById(id: string): Promise<Order | undefined> {
  const row = getDb()
    .prepare("SELECT * FROM orders WHERE id = ?")
    .get(id) as OrderRow | undefined;
  if (!row) return undefined;
  return rowToOrder(row, itemsFor(id));
}

// ---- Cambiar estado (con descuento de stock atómico) ----------------

// Cambia el estado de un pedido. Si pasa a "pagado", descuenta el stock
// de cada talla comprada — todo en UNA transacción indivisible.
export async function setOrderStatus(
  id: string,
  status: OrderStatus,
  extra?: { mpPaymentId?: string }
): Promise<Order | undefined> {
  const db = getDb();

  const update = db.transaction((): Order | undefined => {
    const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as
      | OrderRow
      | undefined;
    if (!row) return undefined;

    // Descontar stock solo la primera vez que pasa a "pagado".
    if (status === "pagado" && row.stockApplied !== 1) {
      const items = db
        .prepare("SELECT * FROM order_items WHERE order_id = ?")
        .all(id) as ItemRow[];
      const dec = db.prepare(
        "UPDATE variants SET stock = MAX(0, stock - ?) WHERE sku = ? AND product_id = ?"
      );
      for (const it of items) {
        if (it.sku) dec.run(it.qty, it.sku, it.productId);
      }
      db.prepare("UPDATE orders SET stockApplied = 1 WHERE id = ?").run(id);
    }

    if (extra?.mpPaymentId) {
      db.prepare("UPDATE orders SET status = ?, mpPaymentId = ? WHERE id = ?").run(
        status,
        extra.mpPaymentId,
        id
      );
    } else {
      db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id);
    }

    const updated = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as OrderRow;
    return rowToOrder(updated, itemsFor(id));
  });

  return update();
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
  const db = getDb();
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const paid = db
    .prepare(
      "SELECT COUNT(*) AS ventas, COALESCE(SUM(total), 0) AS ingresos FROM orders WHERE status = 'pagado'"
    )
    .get() as { ventas: number; ingresos: number };

  const pend = db
    .prepare("SELECT COUNT(*) AS pendientes FROM orders WHERE status = 'pendiente'")
    .get() as { pendientes: number };

  const units = db
    .prepare(
      `SELECT COALESCE(SUM(oi.qty), 0) AS unidades
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status = 'pagado'`
    )
    .get() as { unidades: number };

  const mes = db
    .prepare(
      "SELECT COALESCE(SUM(total), 0) AS ingresosMes FROM orders WHERE status = 'pagado' AND createdAt LIKE ?"
    )
    .get(`${ym}%`) as { ingresosMes: number };

  return {
    ingresos: paid.ingresos,
    ventas: paid.ventas,
    unidades: units.unidades,
    pendientes: pend.pendientes,
    ingresosMes: mes.ingresosMes,
  };
}

// Productos más vendidos (por unidades pagadas).
export async function getTopProducts(
  limit = 5
): Promise<
  { name: string; productId: string; unidades: number; ingresos: number }[]
> {
  const rows = getDb()
    .prepare(
      `SELECT oi.productId AS productId,
              MAX(oi.name) AS name,
              SUM(oi.qty) AS unidades,
              SUM(oi.price * oi.qty) AS ingresos
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status = 'pagado'
       GROUP BY oi.productId
       ORDER BY unidades DESC
       LIMIT ?`
    )
    .all(limit) as {
    productId: string;
    name: string;
    unidades: number;
    ingresos: number;
  }[];
  return rows;
}
