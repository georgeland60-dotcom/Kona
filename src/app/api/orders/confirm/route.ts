import { NextResponse } from "next/server";
import { getOrderById, setOrderStatus } from "@/lib/orders-data";

// Mercado Pago redirige aquí (vía /pago/exito) con la referencia del pedido.
// Si el pago fue aprobado, marcamos el pedido como pagado y descontamos stock.
// Es idempotente: llamarlo dos veces no descuenta stock dos veces.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ref = url.searchParams.get("ref") || url.searchParams.get("external_reference");
  const status = url.searchParams.get("status") || "";
  const paymentId = url.searchParams.get("payment_id") || undefined;

  if (!ref) {
    return NextResponse.json({ ok: false, error: "Falta la referencia" }, { status: 400 });
  }

  const order = await getOrderById(ref);
  if (!order) {
    return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
  }

  const aprobado = status === "approved";
  if (aprobado && order.status !== "pagado") {
    await setOrderStatus(ref, "pagado", { mpPaymentId: paymentId });
  }

  const updated = await getOrderById(ref);
  return NextResponse.json({ ok: true, id: ref, status: updated?.status });
}
