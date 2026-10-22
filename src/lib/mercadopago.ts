// =============================================================
//  HABLAR CON MERCADO PAGO
//
//  Un solo sitio para preguntarle a Mercado Pago por un pago. Lo usan
//  el aviso automático (el webhook) y la vuelta de la clienta a la
//  tienda, para que los dos caminos crean lo mismo: lo que diga
//  Mercado Pago, no lo que diga el navegador.
// =============================================================

const API = process.env.MERCADOPAGO_API_URL || "https://api.mercadopago.com";

export type PagoMP = {
  id?: number;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  transaction_amount?: number;
  payment_method_id?: string;
};

export async function leerPago(id: string): Promise<PagoMP | null> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token || !id) return null;

  try {
    const res = await fetch(`${API}/v1/payments/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as PagoMP;
  } catch {
    return null;
  }
}

// ¿Este pago paga ese pedido? Aprobado y por el monto completo. El
// medio io sea tarjeta o Yape da igual: lo que importa es que entró.
export function pagaElPedido(pago: PagoMP, total: number): boolean {
  if (pago.status !== "approved") return false;
  // Medio soles de margen por los redondeos de la pasarela.
  return Number(pago.transaction_amount ?? 0) + 0.5 >= total;
}
