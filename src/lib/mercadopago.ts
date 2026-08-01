// =============================================================
//  VERIFICACIÓN DE PAGOS DE MERCADO PAGO (lado servidor)
//  NUNCA se confía en lo que llega por la URL del navegador
//  (?status=approved podría falsificarse). Aquí le preguntamos
//  directamente a Mercado Pago si el pago existe y está aprobado,
//  y además comprobamos que el MONTO coincida con el del pedido.
//  Usado por el redirect (/api/orders/confirm) y por el webhook.
// =============================================================

import { MercadoPagoConfig, Payment } from "mercadopago";
import { getOrderById, setOrderStatus } from "@/lib/orders-data";

export function getAccessToken(): string | null {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token || token.includes("pega-tu")) return null;
  return token;
}

export type VerifyResult = {
  ok: boolean;
  // motivo de fallo (para logs); "verified" si todo salió bien
  reason:
    | "verified"
    | "no-token"
    | "no-payment-id"
    | "not-found-payment"
    | "no-reference"
    | "order-not-found"
    | "amount-mismatch"
    | "not-approved"
    | "error";
  orderId?: string;
  orderStatus?: string;
  paymentStatus?: string;
};

// Consulta el pago en Mercado Pago y, SOLO si de verdad está aprobado y el
// monto coincide con el pedido, lo marca como pagado (descuenta stock).
// Es idempotente: si ya estaba pagado, no vuelve a descontar.
export async function verifyAndApplyPayment(
  paymentId: string | number | undefined | null
): Promise<VerifyResult> {
  const token = getAccessToken();
  if (!token) return { ok: false, reason: "no-token" };
  if (!paymentId) return { ok: false, reason: "no-payment-id" };

  let payment: {
    id?: number | string;
    status?: string;
    external_reference?: string | null;
    transaction_amount?: number | null;
  };
  try {
    const client = new MercadoPagoConfig({ accessToken: token });
    payment = await new Payment(client).get({ id: String(paymentId) });
  } catch (e) {
    console.error("[mercadopago] no se pudo consultar el pago:", e);
    return { ok: false, reason: "not-found-payment" };
  }

  const ref = payment.external_reference || undefined;
  if (!ref) return { ok: false, reason: "no-reference" };

  const order = await getOrderById(ref);
  if (!order) return { ok: false, reason: "order-not-found", orderId: ref };

  // El pago debe estar aprobado.
  if (payment.status !== "approved") {
    return {
      ok: false,
      reason: "not-approved",
      orderId: ref,
      orderStatus: order.status,
      paymentStatus: payment.status,
    };
  }

  // El monto pagado debe coincidir con el total del pedido (evita que se
  // manipule el precio). Toleramos 1 centavo por redondeos.
  const paid = Number(payment.transaction_amount ?? 0);
  if (Math.abs(paid - order.total) > 0.01) {
    console.error(
      `[mercadopago] MONTO NO COINCIDE en ${ref}: pagado ${paid} vs total ${order.total}`
    );
    return {
      ok: false,
      reason: "amount-mismatch",
      orderId: ref,
      orderStatus: order.status,
      paymentStatus: payment.status,
    };
  }

  // Todo correcto: marcar pagado (idempotente, descuenta stock una sola vez).
  const updated = await setOrderStatus(ref, "pagado", {
    mpPaymentId: String(payment.id ?? paymentId),
  });

  return {
    ok: true,
    reason: "verified",
    orderId: ref,
    orderStatus: updated?.status ?? "pagado",
    paymentStatus: payment.status,
  };
}
