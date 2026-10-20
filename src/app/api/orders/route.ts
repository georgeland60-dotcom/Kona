import { NextResponse } from "next/server";
import { createOrder } from "@/lib/orders-data";
import { priceForItems } from "@/lib/pricing";
import { costoDeEnvio } from "@/lib/envios";
import type { OrderItem, OrderMethod } from "@/lib/types";

// Crea un pedido (usado por el checkout de WhatsApp). El precio de cada
// producto y el total se RECALCULAN en el servidor (no se confía en el
// precio que manda el navegador), aplicando los descuentos vigentes.
export async function POST(req: Request) {
  const body = (await req.json()) as {
    method?: OrderMethod;
    items?: OrderItem[];
    destino?: string;
    direccion?: string;
    customer?: { name?: string; phone?: string; email?: string };
  };

  const incoming = body.items || [];
  if (incoming.length === 0) {
    return NextResponse.json({ error: "Pedido vacío" }, { status: 400 });
  }

  const items = await priceForItems(incoming);
  if (items.length === 0) {
    return NextResponse.json(
      { error: "Los productos del carrito ya no están disponibles" },
      { status: 409 }
    );
  }

  // El envío se busca por nombre en la tabla de la tienda: lo que diga
  // el navegador sobre el precio da igual.
  const envio = costoDeEnvio(body.destino);
  const total =
    items.reduce((s, i) => s + i.price * i.qty, 0) + envio.costo;

  const resultado = await createOrder({
    items,
    total,
    method: body.method === "mercadopago" ? "mercadopago" : "whatsapp",
    status: "pendiente",
    customer: body.customer,
    ...(envio.destino || body.direccion
      ? {
          envio: {
            destino: envio.destino ?? "",
            costo: envio.costo,
            ...(body.direccion ? { direccion: body.direccion.slice(0, 200) } : {}),
          },
        }
      : {}),
  });

  // Alguien se llevó la última unidad entre que armó el carrito y
  // confirmó. Es mejor decirlo ahora que despachar lo que no hay.
  if (!resultado.ok) {
    return NextResponse.json(
      {
        error: "Se agotó algo mientras terminabas el pedido",
        faltantes: resultado.faltantes.map((f) => ({
          producto: f.nombre,
          pedidas: f.pedidas,
          quedan: f.disponibles,
        })),
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    ok: true,
    id: resultado.order.id,
    envio: { destino: envio.destino, costo: envio.costo, conocido: envio.conocido },
  });
}
