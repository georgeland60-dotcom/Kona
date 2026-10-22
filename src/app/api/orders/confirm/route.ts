import { NextResponse } from "next/server";
import { getOrderById, setOrderStatus } from "@/lib/orders-data";
import { leerPago, pagaElPedido } from "@/lib/mercadopago";

// La clienta vuelve a la tienda después de pagar y pasa por aquí.
//
// OJO con lo que NO hace: ya no se cree el "status=approved" que viene
// en la dirección. Cualquiera podía escribirlo a mano y llevarse el
// pedido sin pagar. Ahora, si trae un id de pago, se le pregunta a
// Mercado Pago; y si no, simplemente se informa de cómo está el pedido,
// que el aviso automático de Mercado Pago ya lo habrá puesto al día.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ref =
    url.searchParams.get("ref") || url.searchParams.get("external_reference");
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

  if (paymentId && order.status !== "pagado") {
    const pago = await leerPago(paymentId);
    // Que el pago sea de ESTE pedido, no de otro cualquiera.
    if (
      pago &&
      pago.external_reference === ref &&
      pagaElPedido(pago, order.total)
    ) {
      await setOrderStatus(ref, "pagado", {
        mpPaymentId: String(pago.id ?? paymentId),
      });
    }
  }

  const updated = await getOrderById(ref);
  return NextResponse.json({ ok: true, id: ref, status: updated?.status });
}
