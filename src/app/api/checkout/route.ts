import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createOrder } from "@/lib/orders-data";
import { priceForItems } from "@/lib/pricing";

// Esta funcion corre en el SERVIDOR (seguro). Aqui se usa el token secreto
// para crear el cobro. El navegador del cliente nunca ve el token.

type IncomingItem = {
  productId: string;
  sku?: string;
  name: string;
  price: number;
  qty: number;
  size?: string;
};

export async function POST(req: Request) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;

  // Si todavia no pegaste tu Access Token en .env.local
  if (!token || token.includes("pega-tu")) {
    return NextResponse.json(
      {
        error:
          "Falta configurar tu Access Token de Mercado Pago en el archivo .env.local",
      },
      { status: 500 }
    );
  }

  const { items: rawItems } = (await req.json()) as { items: IncomingItem[] };
  if (!rawItems || rawItems.length === 0) {
    return NextResponse.json({ error: "El carrito esta vacio" }, { status: 400 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Recalculamos precios en el servidor (con descuentos vigentes).
  const items = await priceForItems(rawItems);
  if (items.length === 0) {
    return NextResponse.json({ error: "El carrito esta vacio" }, { status: 400 });
  }
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  // Registramos el pedido como "pendiente" antes de mandar a pagar.
  const order = await createOrder({
    items,
    total,
    method: "mercadopago",
    status: "pendiente",
  });

  const client = new MercadoPagoConfig({ accessToken: token });
  const preference = new Preference(client);

  try {
    const result = await preference.create({
      body: {
        external_reference: order.id,
        items: items.map((i, idx) => ({
          id: String(idx),
          title: i.size ? `${i.name} (Talla ${i.size})` : i.name,
          quantity: i.qty,
          unit_price: i.price,
          currency_id: "PEN",
        })),
        back_urls: {
          success: `${site}/pago/exito`,
          failure: `${site}/pago/error`,
          pending: `${site}/pago/pendiente`,
        },
        auto_return: "approved",
      },
    });

    return NextResponse.json({ url: result.init_point });
  } catch (e) {
    console.error("Error creando preferencia de Mercado Pago:", e);
    return NextResponse.json(
      { error: "No se pudo iniciar el pago. Revisa tu Access Token." },
      { status: 500 }
    );
  }
}
