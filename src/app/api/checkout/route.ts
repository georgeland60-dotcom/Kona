import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createOrder } from "@/lib/orders-data";
import { priceForItems } from "@/lib/pricing";
import { costoDeEnvio } from "@/lib/envios";

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

  const { items: rawItems, destino, direccion } = (await req.json()) as {
    items: IncomingItem[];
    destino?: string;
    direccion?: string;
  };
  if (!rawItems || rawItems.length === 0) {
    return NextResponse.json({ error: "El carrito esta vacio" }, { status: 400 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Recalculamos precios en el servidor (con descuentos vigentes).
  const items = await priceForItems(rawItems);
  if (items.length === 0) {
    return NextResponse.json({ error: "El carrito esta vacio" }, { status: 400 });
  }
  // El envío, igual que los precios, sale de la tabla de la tienda y no
  // de lo que mande el navegador.
  const envio = costoDeEnvio(destino);
  const total =
    items.reduce((s, i) => s + i.price * i.qty, 0) + envio.costo;

  // Registramos el pedido como "pendiente" antes de mandar a pagar. Eso
  // le RESERVA el stock: mientras esté pagando, nadie más se lleva esas
  // unidades. Si no vuelve, se sueltan solas al rato.
  const resultado = await createOrder({
    items,
    total,
    method: "mercadopago",
    status: "pendiente",
    ...(envio.destino || direccion
      ? {
          envio: {
            destino: envio.destino ?? "",
            costo: envio.costo,
            ...(direccion ? { direccion: direccion.slice(0, 200) } : {}),
          },
        }
      : {}),
  });

  if (!resultado.ok) {
    const detalle = resultado.faltantes
      .map((f) => `${f.nombre}: quedan ${f.disponibles}`)
      .join(", ");
    return NextResponse.json(
      {
        error: `Se agotó algo mientras terminabas la compra (${detalle}). Ajusta el carrito y vuelve a intentar.`,
      },
      { status: 409 }
    );
  }

  const order = resultado.order;

  const client = new MercadoPagoConfig({ accessToken: token });
  const preference = new Preference(client);

  try {
    const result = await preference.create({
      body: {
        external_reference: order.id,
        items: [
          ...items.map((i, idx) => ({
            id: String(idx),
            title: i.size ? `${i.name} (Talla ${i.size})` : i.name,
            quantity: i.qty,
            unit_price: i.price,
            currency_id: "PEN",
          })),
          // El envío va como una línea más: Mercado Pago cobra la suma
          // de lo que se le manda, así que si no va aquí, no se cobra.
          ...(envio.costo > 0
            ? [
                {
                  id: "envio",
                  title: `Envío a ${envio.destino}`,
                  quantity: 1,
                  unit_price: envio.costo,
                  currency_id: "PEN",
                },
              ]
            : []),
        ],
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
