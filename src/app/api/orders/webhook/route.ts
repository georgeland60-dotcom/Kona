import { NextResponse } from "next/server";
import { WebhookSignatureValidator, InvalidWebhookSignatureError } from "mercadopago";
import { verifyAndApplyPayment } from "@/lib/mercadopago";

// WEBHOOK de Mercado Pago: es la FUENTE DE VERDAD de los pagos.
// Mercado Pago llama aquí cuando un pago cambia de estado (aunque el cliente
// cierre la pestaña y nunca vuelva a /pago/exito). Aquí:
//   1) Validamos la FIRMA (x-signature) para asegurarnos de que la llamada
//      viene de verdad de Mercado Pago y no de un impostor.
//   2) Consultamos el pago servidor-a-servidor y, si está aprobado y el monto
//      coincide, marcamos el pedido como pagado (idempotente).
//
// La URL de este endpoint se configura como notification_url al crear el pago
// (ver src/app/api/checkout/route.ts) y también en el panel de Mercado Pago.
export async function POST(req: Request) {
  const url = new URL(req.url);

  // Body (Mercado Pago manda JSON). Lo leemos de forma tolerante.
  let body: { type?: string; action?: string; data?: { id?: string } } = {};
  try {
    body = await req.json();
  } catch {
    // algunas notificaciones vienen sin body; usamos los query params
  }

  const dataId = url.searchParams.get("data.id") || body.data?.id || undefined;
  const type = url.searchParams.get("type") || body.type || undefined;

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  // Sin secreto configurado no podemos verificar autenticidad: no procesamos
  // (el redirect verificado sigue confirmando los pagos). Avisamos en el log.
  if (!secret) {
    console.warn(
      "[webhook] MERCADOPAGO_WEBHOOK_SECRET no configurado: se ignora la notificación."
    );
    return NextResponse.json({ ok: true, skipped: "no-secret" });
  }

  // 1) Validar la firma. Si no es auténtica -> 401.
  try {
    WebhookSignatureValidator.validate({
      xSignature: req.headers.get("x-signature"),
      xRequestId: req.headers.get("x-request-id"),
      dataId: url.searchParams.get("data.id"),
      secret,
      toleranceSeconds: 300, // mitiga reenvíos (replay)
    });
  } catch (e) {
    if (e instanceof InvalidWebhookSignatureError) {
      console.warn(`[webhook] firma inválida: ${e.reason}`);
      return NextResponse.json({ ok: false, error: "firma inválida" }, { status: 401 });
    }
    console.error("[webhook] error validando firma:", e);
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // 2) Solo nos interesan las notificaciones de pago.
  if (type === "payment" && dataId) {
    const result = await verifyAndApplyPayment(dataId);
    console.log(
      `[webhook] pago ${dataId}: ${result.reason}` +
        (result.orderId ? ` (pedido ${result.orderId} -> ${result.orderStatus})` : "")
    );
  }

  // Siempre 200 para que Mercado Pago no reintente en bucle.
  return NextResponse.json({ ok: true });
}
