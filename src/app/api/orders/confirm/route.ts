import { NextResponse } from "next/server";
import { getOrderById } from "@/lib/orders-data";
import { verifyAndApplyPayment } from "@/lib/mercadopago";

// Mercado Pago redirige aquí (vía /pago/exito) tras el pago, con el
// payment_id y la referencia del pedido en la URL.
//
// IMPORTANTE (seguridad): NO confiamos en el parámetro ?status=approved de
// la URL — cualquiera podría escribirlo a mano. En su lugar consultamos el
// pago directamente en Mercado Pago (servidor a servidor) y comprobamos que
// esté aprobado y que el monto coincida antes de marcar el pedido como pagado.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ref =
    url.searchParams.get("external_reference") || url.searchParams.get("ref");
  const paymentId =
    url.searchParams.get("payment_id") ||
    url.searchParams.get("collection_id") ||
    undefined;

  if (!ref) {
    return NextResponse.json(
      { ok: false, error: "Falta la referencia" },
      { status: 400 }
    );
  }

  const order = await getOrderById(ref);
  if (!order) {
    return NextResponse.json(
      { ok: false, error: "Pedido no encontrado" },
      { status: 404 }
    );
  }

  // Verificamos el pago contra Mercado Pago (si viene payment_id).
  const result = await verifyAndApplyPayment(paymentId);
  if (!result.ok && result.reason !== "verified") {
    // No pudimos confirmar el pago como aprobado. No marcamos nada como
    // pagado: el webhook (fuente de verdad) lo hará cuando corresponda.
    console.warn(`[confirm] pago no confirmado para ${ref}: ${result.reason}`);
  }

  const updated = await getOrderById(ref);
  return NextResponse.json({ ok: true, id: ref, status: updated?.status });
}
