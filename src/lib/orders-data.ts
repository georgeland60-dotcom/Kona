// =============================================================
//  CAPA DE DATOS DE PEDIDOS (ventas)
//  Guarda los pedidos en el documento "orders". Dónde acaban (base KV
//  o disco local) lo decide lib/kv.ts.
//  El stock se RESERVA al crear el pedido, no al pagarlo: si se esperara
//  al pago, dos clientas podrían comprar la última unidad a la vez y las
//  dos se irían convencidas de que la tienen. Lo que se reserva y no se
//  paga se suelta solo pasado un tiempo.
// =============================================================

import type { Order, OrderItem, OrderStatus, PagoManual } from "@/lib/types";
import {
  descontarStock,
  devolverStock,
  type Faltante,
} from "@/lib/store-data";
import { conCandado, readDoc, writeDoc } from "@/lib/kv";

type OrdersData = {
  orders: Order[];
  seq: number; // contador para numerar pedidos
  // Fecha de la limpieza de pedidos de prueba ya hecha (ver abajo).
  pruebasBorradas?: string;
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
  // Quien va a hacer una transferencia o un Yape está buscando la app,
  // el número o el dinero: necesita margen, igual que el de WhatsApp.
  transferencia: 24 * 60 * 60 * 1000,
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
  await borrarPedidosDePrueba();
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

// ---- Pedidos de prueba, fuera -----------------------------------------
//
//  Del PED-0001 al PED-0019 fueron todos pruebas de la tienda (la dueña lo
//  confirmó el 27 nov 2026): compras de S/ 1 del producto Prueba, envíos
//  a la propia tienda, intentos de pago. Se borran para que el panel, las
//  ventas y los más vendidos empiecen limpios.
//
//  Lo que alguno tenía apartado vuelve al inventario antes de borrarlo:
//  si no, esas unidades se quedarían reservadas para un pedido que ya no
//  existe y nadie más podría comprarlas.
//
//  El contador NO se reinicia: el próximo pedido es el PED-0020. Mercado
//  Pago y los correos ya enviados conocen los números viejos; si un aviso
//  tardío de un pago de prueba llegara con "PED-0016", no debe caer sobre
//  un pedido real con ese mismo número. Una sola vez, por número.
const PEDIDOS_DE_PRUEBA = Array.from(
  { length: 19 },
  (_, i) => makeId(i + 1)
);
// Y el PED-0020 al PED-0024: los creó por error una comprobación del
// asistente mientras se publicaba lo de arriba (27 nov 2026, 05:53-05:54
// UTC). Un Cárdigan Joy verde sin talla, sin clienta y sin stock apartado.
// Se borran solo si son exactamente eso: si un número de esos fuera de
// un pedido real, no se toca. (Las horas de abajo son UTC: en Lima
// era la 1 de la madrugada.)
const PEDIDOS_DEL_ASISTENTE = ["PED-0020", "PED-0021", "PED-0022", "PED-0023", "PED-0024"];
function esDelAsistente(o: Order): boolean {
  return (
    PEDIDOS_DEL_ASISTENTE.includes(o.id) &&
    o.createdAt.startsWith("2026-11-27T05:5") &&
    !o.customer?.email &&
    !o.customer?.phone &&
    o.items.length === 1 &&
    o.items[0].productId === "12571" &&
    !o.items[0].sku
  );
}
export const LIMPIEZA_PEDIDOS = "2026-11-27c";

export async function borrarPedidosDePrueba(): Promise<void> {
  const { pruebasBorradas } = await readOrders();
  if (pruebasBorradas === LIMPIEZA_PEDIDOS) return; // lo normal

  await conCandado("stock", async () => {
    const data = await readOrders();
    if (data.pruebasBorradas === LIMPIEZA_PEDIDOS) return;

    for (const pedido of data.orders) {
      const borrar = PEDIDOS_DE_PRUEBA.includes(pedido.id) || esDelAsistente(pedido);
      if (!borrar || !pedido.stockApplied) continue;
      // Un pedido pagado ya salió del almacén de verdad; uno de prueba no.
      await devolverStock(pedido.items);
    }
    data.orders = data.orders.filter(
      (o) => !PEDIDOS_DE_PRUEBA.includes(o.id) && !esDelAsistente(o)
    );
    data.pruebasBorradas = LIMPIEZA_PEDIDOS;
    await writeOrders(data);
  });
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
  pagoElegido?: Order["pagoElegido"];
  status?: OrderStatus;
  customer?: Order["customer"];
  envio?: Order["envio"];
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
      ...(input.pagoElegido ? { pagoElegido: input.pagoElegido } : {}),
      status: input.status ?? "pendiente",
      customer: input.customer,
      ...(input.envio ? { envio: input.envio } : {}),
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
  await borrarPedidosDePrueba();
  const { orders } = await readOrders();
  const list = opts?.status
    ? orders.filter((o) => o.status === opts.status)
    : orders;
  // Más recientes primero.
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getOrderById(id: string): Promise<Order | undefined> {
  await borrarPedidosDePrueba();
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
  let recienPagado = false;
  const resultado = await conCandado("stock", async () => {
    const data = await readOrders();
    const order = data.orders.find((o) => o.id === id);
    if (!order) return undefined;
    recienPagado = status === "pagado" && order.status !== "pagado";

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

  // El correo de "pago confirmado", fuera del candado: mandar un correo
  // tarda, y mientras tanto nadie más podría tocar el stock.
  if (recienPagado) await avisar(id, "pagado");
  return resultado;
}

async function avisar(id: string, momento: "recibido" | "pagado") {
  const { avisarPedido } = await import("@/lib/correos-pedido");
  await avisarPedido(id, momento);
}

// Marca que el correo de ese momento ya se está mandando. Devuelve false
// si otro camino ya lo hizo: así no le llegan dos iguales a la clienta.
export async function reclamarCorreo(
  id: string,
  momento: "recibido" | "pagado"
): Promise<boolean> {
  return conCandado("stock", async () => {
    const data = await readOrders();
    const order = data.orders.find((o) => o.id === id);
    if (!order || order.correos?.[momento]) return false;
    order.correos = { ...order.correos, [momento]: new Date().toISOString() };
    await writeOrders(data);
    return true;
  });
}

// Si el envío falló, se quita la marca para poder intentarlo otra vez.
export async function soltarCorreo(id: string, momento: "recibido" | "pagado") {
  await conCandado("stock", async () => {
    const data = await readOrders();
    const order = data.orders.find((o) => o.id === id);
    if (!order?.correos?.[momento]) return;
    const { [momento]: _fuera, ...resto } = order.correos;
    void _fuera;
    order.correos = resto;
    await writeOrders(data);
  });
}

// Pedido por Yape, Plin o transferencia: la clienta dice que pagó. Le
// llega su resumen y a la tienda el aviso para revisar el pago.
export async function avisarPedidoRecibido(id: string) {
  await avisar(id, "recibido");
}

// ---- Pagos por fuera de la pasarela ---------------------------------
//
//  Yape, Plin y las transferencias las confirma una persona mirando la
//  captura, no un webhook. Esto es lo que deja constancia de quién lo
//  dio por pagado, con qué y con qué comprobante: sin eso, "pagado" es
//  una palabra sin respaldo y nadie puede auditar la caja.
export async function registrarPago(
  id: string,
  pago: Omit<PagoManual, "registradoEn"> & { registradoEn?: string }
): Promise<Order | undefined> {
  const orden = await setOrderStatus(id, "pagado");
  if (!orden) return undefined;

  return conCandado("stock", async () => {
    const data = await readOrders();
    const order = data.orders.find((o) => o.id === id);
    if (!order) return undefined;
    order.pago = { ...pago, registradoEn: pago.registradoEn ?? new Date().toISOString() };
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
  await borrarPedidosDePrueba();
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
