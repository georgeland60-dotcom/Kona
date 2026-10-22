// =============================================================
//  PAGOS DE MERCADO PAGO, CONFIRMADOS EN SERIO
//
//  Hasta ahora un pedido se daba por pagado porque el navegador volvía
//  a /pago/exito diciendo "approved". Eso tiene dos agujeros:
//
//   1. Cualquiera podía escribir esa dirección a mano y llevarse el
//      pedido sin pagar.
//   2. Con Yape se paga en OTRA app. Si la clienta no vuelve a la
//      pestaña —y muchas no vuelven—, el pedido se quedaba "pendiente"
//      aunque el dinero ya estuviera, y a los 45 minutos se le soltaba
//      el stock que había pagado.
//
//  Esto lo arregla por donde se arregla: Mercado Pago avisa al
//  servidor, y el servidor le PREGUNTA A MERCADO PAGO cuánto y cómo se
//  pagó. Lo que diga el navegador deja de importar.
// =============================================================

import crypto from "crypto";
import { getOrderById, setOrderStatus } from "@/lib/orders-data";
import { leerPago, pagaElPedido } from "@/lib/mercadopago";

// La firma que manda Mercado Pago. Solo se comprueba si hay secreto
// configurado; sin él, igual se verifica preguntando por el pago, que
// es la garantía de verdad.
function firmaValida(req: Request, idPago: string): boolean {
  const secreto = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secreto) return true;

  const firma = req.headers.get("x-signature") || "";
  const pedido = req.headers.get("x-request-id") || "";

  const partes = Object.fromEntries(
    firma.split(",").map((p) => {
      const [k, ...v] = p.split("=");
      return [k.trim(), v.join("=").trim()];
    })
  );
  if (!partes.ts || !partes.v1) return false;

  const manifiesto = `id:${idPago};request-id:${pedido};ts:${partes.ts};`;
  const esperada = crypto
    .createHmac("sha256", secreto)
    .update(manifiesto)
    .digest("hex");

  const a = Buffer.from(esperada);
  const b = Buffer.from(partes.v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Mercado Pago reintenta si no le contestamos 200, así que casi todo
// termina en 200: lo que no se pudo procesar se registra y se deja ir,
// salvo los fallos de red, donde sí interesa que reintente.
export async function POST(req: Request) {
  const url = new URL(req.url);

  // Llega de varias formas según la antigüedad de la integración.
  let cuerpo: { type?: string; topic?: string; data?: { id?: string } } = {};
  try {
    cuerpo = await req.json();
  } catch {
    // Las notificaciones viejas vienen solo por la URL.
  }

  const tipo = cuerpo.type || cuerpo.topic || url.searchParams.get("topic") || "";
  const idPago =
    cuerpo.data?.id ||
    url.searchParams.get("data.id") ||
    url.searchParams.get("id") ||
    "";

  if (!idPago) return Response.json({ ok: true, ignorado: "sin id" });
  if (tipo && !tipo.includes("payment")) {
    return Response.json({ ok: true, ignorado: tipo });
  }

  if (!firmaValida(req, String(idPago))) {
    console.log("[pagos] firma inválida, se ignora", idPago);
    return Response.json({ ok: false, error: "firma" }, { status: 401 });
  }

  const pago = await leerPago(String(idPago));
  if (!pago) {
    // No se pudo preguntar: que Mercado Pago reintente.
    return Response.json({ ok: false, error: "no se pudo leer" }, { status: 500 });
  }

  const ref = pago.external_reference;
  if (!ref) return Response.json({ ok: true, ignorado: "sin pedido" });

  const pedido = await getOrderById(ref);
  if (!pedido) return Response.json({ ok: true, ignorado: "pedido inexistente" });

  // Que el monto cuadre. Un pago aprobado por menos de lo que vale el
  // pedido no es un pedido pagado.
  const pagado = Number(pago.transaction_amount ?? 0);
  const alcanza = pagaElPedido(pago, pedido.total);

  if (alcanza) {
    if (pedido.status !== "pagado") {
      await setOrderStatus(ref, "pagado", { mpPaymentId: String(pago.id ?? idPago) });
      console.log(`[pagos] ${ref} pagado con ${pago.payment_method_id} (${pagado})`);
    }
    return Response.json({ ok: true, pedido: ref, estado: "pagado" });
  }

  // Rechazado o cancelado: se suelta el stock para que no quede
  // apartado por un pago que no va a llegar.
  if (["rejected", "cancelled"].includes(pago.status ?? "")) {
    if (pedido.status === "pendiente") {
      await setOrderStatus(ref, "cancelado");
      console.log(`[pagos] ${ref} cancelado (${pago.status_detail})`);
    }
    return Response.json({ ok: true, pedido: ref, estado: "cancelado" });
  }

  if (pago.status === "approved" && !alcanza) {
    console.log(
      `[pagos] ${ref} pagó ${pagado} y el pedido vale ${pedido.total}: no se marca pagado`
    );
  }

  // En proceso (Yape suele pasar por aquí un momento): se deja como
  // está y Mercado Pago volverá a avisar cuando se resuelva.
  return Response.json({ ok: true, pedido: ref, estado: pedido.status });
}

// Mercado Pago comprueba a veces que la dirección existe.
export async function GET() {
  return Response.json({ ok: true });
}
