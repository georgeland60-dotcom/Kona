// =============================================================
//  LOS CORREOS DE CADA PEDIDO
//
//  Dos momentos, y en cada uno le llega a la clienta su resumen y a la
//  tienda el aviso de venta:
//   - "recibido": pidió y dice que pagó por Yape, Plin o transferencia.
//     El pago todavía lo tiene que confirmar la dueña.
//   - "pagado": el pago quedó confirmado (Mercado Pago solo, o la dueña
//     desde el panel o el bot).
//
//  Cada correo se manda UNA vez por pedido: se marca en el pedido antes
//  de mandarlo, y si el envío falla se desmarca.
// =============================================================

import { formatPrice } from "@/lib/format";
import { urlDelSitio } from "@/lib/sitio";
import { store } from "@/config/store";
import { resumenDelPedido, type ResumenPedido } from "@/lib/resumen-pedido";
import {
  correoConfigurado,
  correosDeLaTienda,
  enviarCorreo,
  esCorreo,
} from "@/lib/correo";
import type { Order } from "@/lib/types";

export type MomentoCorreo = "recibido" | "pagado";

function escapar(t: string): string {
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const METODO: Record<string, string> = {
  mercadopago: "Tarjeta (Mercado Pago)",
  whatsapp: "Por WhatsApp",
};

function comoPago(o: Order): string {
  if (o.pago?.metodo) {
    const nombres: Record<string, string> = {
      yape: "Yape",
      plin: "Plin",
      transferencia: "Transferencia",
      efectivo: "Efectivo",
      otro: "Otro",
    };
    return nombres[o.pago.metodo] ?? o.pago.metodo;
  }
  if (o.method === "transferencia") {
    return o.pagoElegido === "transferencia" ? "Transferencia bancaria" : "Yape o Plin";
  }
  return METODO[o.method] ?? o.method;
}

function absoluta(ruta: string): string {
  return /^https?:\/\//.test(ruta) ? ruta : `${urlDelSitio()}${ruta}`;
}

// La tabla del pedido, igual para la clienta y para la tienda.
function tablaHtml(r: ResumenPedido): string {
  const filas = r.lineas
    .map(
      (l) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #eee;width:72px;vertical-align:top">
          ${
            l.imagen
              ? `<img src="${escapar(absoluta(l.imagen))}" width="64" height="80" alt="" style="border-radius:8px;object-fit:cover;display:block">`
              : ""
          }
        </td>
        <td style="padding:12px;border-bottom:1px solid #eee;vertical-align:top;font-size:14px">
          <strong>${escapar(l.nombre)}</strong><br>
          <span style="color:#777">${l.talla ? `Talla ${escapar(l.talla)} · ` : ""}Cantidad ${l.cantidad} · ${formatPrice(l.precio)} c/u</span>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;vertical-align:top;font-size:14px;white-space:nowrap">
          ${formatPrice(l.subtotal)}
        </td>
      </tr>`
    )
    .join("");

  const envio = r.envio
    ? `<tr>
        <td colspan="2" style="padding:8px 0;font-size:14px;color:#555">
          ${r.envio.recojo ? "Recojo en tienda" : `Envío a ${escapar(r.envio.destino || "coordinar")}`}
          ${r.envio.direccion ? `<br><span style="font-size:12px;color:#888">${escapar(r.envio.direccion)}</span>` : ""}
        </td>
        <td style="padding:8px 0;text-align:right;font-size:14px">${r.envio.costo > 0 ? formatPrice(r.envio.costo) : "Gratis"}</td>
      </tr>`
    : "";

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
      ${filas}
      ${envio}
      <tr>
        <td colspan="2" style="padding:12px 0;font-size:16px;border-top:2px solid #222"><strong>Total</strong></td>
        <td style="padding:12px 0;font-size:16px;text-align:right;border-top:2px solid #222"><strong>${formatPrice(r.total)}</strong></td>
      </tr>
    </table>`;
}

function tablaTexto(r: ResumenPedido): string {
  const lineas = r.lineas.map(
    (l) =>
      `- ${l.nombre}${l.talla ? ` (Talla ${l.talla})` : ""} x${l.cantidad}: ${formatPrice(l.subtotal)}`
  );
  if (r.envio) {
    lineas.push(
      `${r.envio.recojo ? "Recojo en tienda" : `Envío a ${r.envio.destino || "coordinar"}`}: ${
        r.envio.costo > 0 ? formatPrice(r.envio.costo) : "Gratis"
      }${r.envio.direccion ? ` (${r.envio.direccion})` : ""}`
    );
  }
  lineas.push(`Total: ${formatPrice(r.total)}`);
  return lineas.join("\n");
}

function marco(titulo: string, cuerpo: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f6f6f6;font-family:Helvetica,Arial,sans-serif;color:#222">
  <div style="max-width:560px;margin:0 auto;background:#fff">
    <div style="background:#a8005d;color:#fff;padding:20px 24px;font-size:22px">${escapar(store.name)}</div>
    <div style="padding:24px">
      <h1 style="font-size:20px;margin:0 0 12px">${titulo}</h1>
      ${cuerpo}
    </div>
    <div style="padding:16px 24px;font-size:12px;color:#888;border-top:1px solid #eee">
      ${escapar(store.name)} · <a href="${urlDelSitio()}" style="color:#a8005d">${urlDelSitio().replace(/^https?:\/\//, "")}</a>
      · WhatsApp +${store.whatsapp}
    </div>
  </div></body></html>`;
}

// ---- Correo a la clienta ----------------------------------------------

function paraLaClienta(o: Order, r: ResumenPedido, momento: MomentoCorreo) {
  const recojo = !!r.envio?.recojo;
  const siguiente =
    momento === "recibido"
      ? "Recibimos tu pedido y tu comprobante. En cuanto confirmemos el pago te escribimos."
      : recojo
        ? "Tu pago está confirmado. Te escribimos por WhatsApp cuando tu pedido esté listo para recoger."
        : "Tu pago está confirmado. Te escribimos por WhatsApp para coordinar la entrega.";
  const titulo =
    momento === "recibido" ? `Recibimos tu pedido ${r.id}` : `¡Gracias por tu compra! Pedido ${r.id}`;

  const html = marco(
    escapar(titulo),
    `<p style="font-size:14px;line-height:1.5">${escapar(siguiente)}</p>
     <p style="font-size:13px;color:#777">Forma de pago: ${escapar(comoPago(o))}</p>
     ${tablaHtml(r)}
     <p style="font-size:13px;color:#777;margin-top:20px">Guarda tu número de pedido (${escapar(r.id)}) por si necesitas escribirnos.</p>`
  );
  const texto = `${titulo}\n\n${siguiente}\nForma de pago: ${comoPago(o)}\n\n${tablaTexto(r)}\n\n${store.name} · ${urlDelSitio()} · WhatsApp +${store.whatsapp}`;
  return { asunto: `${store.name}: ${titulo}`, html, texto };
}

// ---- Aviso a la tienda ------------------------------------------------

function paraLaTienda(o: Order, r: ResumenPedido, momento: MomentoCorreo) {
  const titulo =
    momento === "recibido"
      ? `Pedido nuevo ${r.id}: confirmar pago (${comoPago(o)})`
      : `Venta pagada ${r.id} · ${formatPrice(r.total)} · ${comoPago(o)}`;
  const enlace = `${urlDelSitio()}/admin/pedidos/${encodeURIComponent(r.id)}`;
  const clienta = o.customer?.email ? `Correo de la clienta: ${o.customer.email}` : "Sin correo de la clienta";
  const html = marco(
    escapar(titulo),
    `<p style="font-size:14px">${
      momento === "recibido"
        ? "La clienta dice que ya pagó. Revisa en tu app que el dinero haya entrado y márcalo como pagado."
        : "El pago está confirmado."
    }</p>
     <p style="font-size:13px;color:#555">${escapar(clienta)}</p>
     ${tablaHtml(r)}
     <p style="margin-top:20px"><a href="${enlace}" style="background:#a8005d;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-size:14px">Ver el pedido en el panel</a></p>`
  );
  const texto = `${titulo}\n${clienta}\n\n${tablaTexto(r)}\n\nVer en el panel: ${enlace}`;
  return { asunto: titulo, html, texto };
}

// ---- Mandar -----------------------------------------------------------

// Manda los correos de un momento del pedido, una sola vez. Nunca
// lanza: si algo falla se registra y la venta sigue su curso.
export async function avisarPedido(id: string, momento: MomentoCorreo): Promise<void> {
  if (!correoConfigurado()) return;
  try {
    // Import tardío: orders-data llama a esta función, y esta a él.
    const { reclamarCorreo, soltarCorreo, getOrderById } = await import("@/lib/orders-data");
    if (!(await reclamarCorreo(id, momento))) return;

    const o = await getOrderById(id);
    if (!o) return;
    const r = await resumenDelPedido(o);
    const tienda = correosDeLaTienda();
    const clienta = esCorreo(o.customer?.email) ? o.customer!.email! : null;

    const envios: Promise<boolean>[] = [];
    if (clienta) {
      const c = paraLaClienta(o, r, momento);
      envios.push(
        enviarCorreo({ para: [clienta], ...c, ...(tienda[0] ? { responderA: tienda[0] } : {}) })
      );
    }
    if (tienda.length) {
      const t = paraLaTienda(o, r, momento);
      envios.push(
        enviarCorreo({ para: tienda, ...t, ...(clienta ? { responderA: clienta } : {}) })
      );
    }
    const resultados = await Promise.all(envios);
    // Si no salió ninguno, se desmarca para que el próximo cambio lo
    // vuelva a intentar.
    if (!resultados.some(Boolean)) await soltarCorreo(id, momento);
  } catch (e) {
    console.log("[correo] aviso del pedido falló:", e instanceof Error ? e.message : e);
  }
}
