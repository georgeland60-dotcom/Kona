import { NextResponse } from "next/server";
import { createOrder } from "@/lib/orders-data";
import { priceForItems } from "@/lib/pricing";
import type { OrderItem, OrderMethod } from "@/lib/types";

// Crea un pedido (usado por el checkout de WhatsApp). El precio de cada
// producto y el total se RECALCULAN en el servidor (no se confía en el
// precio que manda el navegador), aplicando los descuentos vigentes.
export async function POST(req: Request) {
  const body = (await req.json()) as {
    method?: OrderMethod;
    items?: OrderItem[];
    customer?: { name?: string; phone?: string; email?: string };
  };

  const incoming = body.items || [];
  if (incoming.length === 0) {
    return NextResponse.json({ error: "Pedido vacío" }, { status: 400 });
  }

  const items = await priceForItems(incoming);
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const order = await createOrder({
    items,
    total,
    method: body.method === "mercadopago" ? "mercadopago" : "whatsapp",
    status: "pendiente",
    customer: body.customer,
  });

  return NextResponse.json({ ok: true, id: order.id });
}
