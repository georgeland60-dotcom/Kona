import type { Order, PagoManual } from "@/lib/types";

// Cómo se llama en el panel la forma de pago de un pedido. Un pedido de
// pago directo dice con qué quedó en pagar la clienta, que es lo que la
// dueña tiene que buscar en su app antes de marcarlo como pagado.
export function nombreDelMetodo(o: Pick<Order, "method" | "pagoElegido">): string {
  if (o.method === "mercadopago") return "Mercado Pago";
  if (o.method === "whatsapp") return "WhatsApp";
  if (o.pagoElegido === "yape-plin") return "Yape / Plin";
  if (o.pagoElegido === "transferencia") return "Transferencia";
  return "Yape / Plin / transferencia";
}

// Lo que sale ya elegido en "Registrar pago".
export function metodoSugerido(o: Pick<Order, "pagoElegido">): PagoManual["metodo"] {
  return o.pagoElegido === "transferencia" ? "transferencia" : "yape";
}
