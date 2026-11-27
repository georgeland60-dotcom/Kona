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

// ---- El estilo de la web ---------------------------------------------
//
//  Los mismos colores (globals.css), la misma letra (Jost) y la
//  manuscrita del manual de marca (Sacramento) para los títulos, como
//  el "¡Gracias!" de la página de pago. Gmail no carga letras de fuera:
//  ahí se ve con la de respaldo (Helvetica / cursiva), con los mismos
//  colores y el mismo orden.
const C = {
  fucsia: "#a90061",
  fucsiaOscuro: "#74003f",
  texto: "#1e293b",
  gris: "#64748b",
  linea: "#e2e8f0",
  suave: "#f9fafb",
};
const LETRA = "'Jost', Helvetica, Arial, sans-serif";
const MANUSCRITA = "'Sacramento', 'Brush Script MT', cursive";

function boton(texto: string, href: string, oscuro = false): string {
  const fondo = oscuro ? C.texto : C.fucsia;
  return `<a href="${href}" style="display:inline-block;background:${fondo};color:#ffffff;font-family:${LETRA};font-size:15px;padding:12px 28px;border-radius:999px;text-decoration:none">${escapar(texto)}</a>`;
}

// La tabla del pedido, igual para la clienta y para la tienda.
function tablaHtml(r: ResumenPedido): string {
  const filas = r.lineas
    .map(
      (l) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid ${C.linea};width:76px;vertical-align:top">
          ${
            l.imagen
              ? `<img src="${escapar(absoluta(l.imagen))}" width="64" height="80" alt="" style="border-radius:10px;object-fit:cover;display:block;background:${C.suave}">`
              : ""
          }
        </td>
        <td style="padding:14px 12px;border-bottom:1px solid ${C.linea};vertical-align:top;font-family:${LETRA};font-size:15px;color:${C.texto}">
          <span style="font-weight:500">${escapar(l.nombre)}</span><br>
          <span style="color:${C.gris};font-size:13px">${l.talla ? `Talla ${escapar(l.talla)} · ` : ""}Cantidad ${l.cantidad}</span><br>
          <span style="color:${C.gris};font-size:13px">${formatPrice(l.precio)} c/u</span>
        </td>
        <td style="padding:14px 0;border-bottom:1px solid ${C.linea};text-align:right;vertical-align:top;font-family:${LETRA};font-size:15px;color:${C.texto};white-space:nowrap">
          ${formatPrice(l.subtotal)}
        </td>
      </tr>`
    )
    .join("");

  const productos = r.lineas.reduce((s, l) => s + l.subtotal, 0);
  const fila = (izq: string, der: string, estilo = "") =>
    `<tr><td colspan="2" style="padding:6px 0;font-family:${LETRA};font-size:14px;color:${C.gris};${estilo}">${izq}</td><td style="padding:6px 0;text-align:right;font-family:${LETRA};font-size:14px;color:${C.texto};white-space:nowrap;${estilo}">${der}</td></tr>`;

  const envio = r.envio
    ? fila(
        `${r.envio.recojo ? "Recojo en tienda" : `Envío a ${escapar(r.envio.destino || "coordinar")}`}${
          r.envio.direccion
            ? `<br><span style="font-size:12px">${escapar(r.envio.direccion)}</span>`
            : ""
        }`,
        r.envio.costo > 0 ? formatPrice(r.envio.costo) : "Gratis"
      )
    : "";

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
      ${filas}
      <tr><td colspan="3" style="height:8px"></td></tr>
      ${fila("Productos", formatPrice(productos))}
      ${envio}
      <tr>
        <td colspan="2" style="padding:14px 0 0;border-top:1px solid ${C.linea};font-family:${LETRA};font-size:17px;color:${C.texto};font-weight:500">Total</td>
        <td style="padding:14px 0 0;border-top:1px solid ${C.linea};text-align:right;font-family:${LETRA};font-size:17px;color:${C.texto};font-weight:500;white-space:nowrap">${formatPrice(r.total)}</td>
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

// El marco: logo arriba como en la web, título en la manuscrita, y el
// pie de la web (lo que prometemos, redes, #KONAGIRL).
function marco(datos: {
  previa: string; // lo que se lee en la bandeja antes de abrirlo
  titulo: string; // va en la manuscrita
  subtitulo?: string;
  cuerpo: string;
}): string {
  const sitio = urlDelSitio();
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500&family=Sacramento&display=swap" rel="stylesheet">
<style>@import url('https://fonts.googleapis.com/css2?family=Jost:wght@400;500&family=Sacramento&display=swap');</style>
</head>
<body style="margin:0;padding:0;background:${C.suave};font-family:${LETRA};color:${C.texto}">
  <div style="display:none;max-height:0;overflow:hidden">${escapar(datos.previa)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.suave}">
    <tr><td align="center" style="padding:24px 12px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
        <tr><td align="center" style="background:${C.fucsia};padding:22px 24px 18px">
          <a href="${sitio}"><img src="${sitio}/logo-foot.png" width="110" alt="${escapar(store.name)}" style="display:block;border:0"></a>
        </td></tr>
        <tr><td style="padding:32px 28px 8px;text-align:center">
          <div style="font-family:${MANUSCRITA};font-size:48px;line-height:1.1;color:${C.fucsia}">${escapar(datos.titulo)}</div>
          ${
            datos.subtitulo
              ? `<p style="font-family:${LETRA};font-size:15px;line-height:1.6;color:${C.gris};margin:14px 0 0">${datos.subtitulo}</p>`
              : ""
          }
        </td></tr>
        <tr><td style="padding:16px 28px 28px">${datos.cuerpo}</td></tr>
        <tr><td style="background:${C.fucsia};padding:24px 28px;text-align:center;font-family:${LETRA};color:#ffffff">
          <p style="margin:0 0 10px;font-size:13px;line-height:1.6;opacity:.9">${escapar(store.tagline)}. Envíos a todo Lima. Pago seguro. Cambios hasta 7 días después de la compra.</p>
          <p style="margin:0;font-size:13px">
            <a href="${sitio}" style="color:#ffffff">${sitio.replace(/^https?:\/\//, "")}</a>
            &nbsp;·&nbsp;<a href="${escapar(store.instagram)}" style="color:#ffffff">Instagram</a>
            &nbsp;·&nbsp;<a href="https://wa.me/${store.whatsapp}" style="color:#ffffff">WhatsApp</a>
          </p>
          <p style="margin:12px 0 0;font-size:12px;letter-spacing:3px;font-weight:500">#KONAGIRL</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function cajaPedido(r: ResumenPedido, comoPagoTexto: string): string {
  const fecha = new Date(r.fecha).toLocaleString("es-PE", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Lima",
  });
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.suave};border-radius:12px;margin:8px 0 16px">
      <tr>
        <td style="padding:14px 16px;font-family:${LETRA}">
          <span style="font-size:12px;color:${C.gris}">Tu pedido</span><br>
          <span style="font-size:18px;font-weight:500;color:${C.texto}">${escapar(r.id)}</span>
        </td>
        <td style="padding:14px 16px;font-family:${LETRA};text-align:right;font-size:12px;color:${C.gris}">
          ${escapar(fecha)}<br>${escapar(comoPagoTexto)}
        </td>
      </tr>
    </table>`;
}

// ---- Correo a la clienta ----------------------------------------------

function paraLaClienta(o: Order, r: ResumenPedido, momento: MomentoCorreo) {
  const recojo = !!r.envio?.recojo;
  const titulo = momento === "recibido" ? "¡Lo recibimos!" : "¡Gracias!";
  const mensaje =
    momento === "recibido"
      ? "Ya tenemos tu pedido y tu comprobante 💛 En cuanto confirmemos tu pago te escribimos por WhatsApp."
      : recojo
        ? "Tu pago fue aprobado 💛 Te escribimos por WhatsApp cuando tu pedido esté listo para recoger."
        : "Tu pago fue aprobado y tu pedido ya está en camino 💛 Te escribimos por WhatsApp para coordinar la entrega.";
  const asunto =
    momento === "recibido"
      ? `Recibimos tu pedido ${r.id} 💛`
      : `¡Gracias por tu compra! Tu pedido ${r.id} 💛`;
  const wa = `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(`Hola, tengo una consulta sobre mi pedido ${r.id} 💛`)}`;

  const html = marco({
    previa: mensaje,
    titulo,
    subtitulo: escapar(mensaje),
    cuerpo: `${cajaPedido(r, comoPago(o))}
      ${tablaHtml(r)}
      <p style="text-align:center;margin:28px 0 8px">${boton("¿Dudas? Escríbenos por WhatsApp", wa)}</p>
      <p style="text-align:center;margin:12px 0 0">${boton("Seguir viendo la tienda", `${urlDelSitio()}/tienda`, true)}</p>
      <p style="text-align:center;font-family:${LETRA};font-size:13px;color:${C.gris};margin:22px 0 0">Guarda tu número de pedido (${escapar(r.id)}) por si necesitas escribirnos.<br>Vive Kona, vive orgullosa de ti.</p>`,
  });
  const texto = `${titulo}\n\n${mensaje}\n\nPedido ${r.id} · ${comoPago(o)}\n\n${tablaTexto(r)}\n\n¿Dudas? Escríbenos por WhatsApp: https://wa.me/${store.whatsapp}\n${store.name} · ${urlDelSitio()}`;
  return { asunto, html, texto };
}

// ---- Aviso a la tienda ------------------------------------------------

function paraLaTienda(o: Order, r: ResumenPedido, momento: MomentoCorreo) {
  const asunto =
    momento === "recibido"
      ? `Pedido nuevo ${r.id}: confirmar pago (${comoPago(o)})`
      : `Venta pagada ${r.id} · ${formatPrice(r.total)} · ${comoPago(o)}`;
  const enlace = `${urlDelSitio()}/admin/pedidos/${encodeURIComponent(r.id)}`;
  const clienta = o.customer?.email
    ? `Correo de la clienta: <a href="mailto:${escapar(o.customer.email)}" style="color:${C.fucsia}">${escapar(o.customer.email)}</a>`
    : "Sin correo de la clienta";
  const aviso =
    momento === "recibido"
      ? "La clienta dice que ya pagó. Revisa en tu app que el dinero haya entrado y márcalo como pagado."
      : "El pago está confirmado. Ya puedes preparar el pedido.";

  const html = marco({
    previa: aviso,
    titulo: momento === "recibido" ? "¡Pedido nuevo!" : "¡Venta pagada!",
    subtitulo: `${escapar(aviso)}<br><span style="font-size:13px">${clienta}</span>`,
    cuerpo: `${cajaPedido(r, comoPago(o))}
      ${tablaHtml(r)}
      <p style="text-align:center;margin:28px 0 0">${boton("Ver el pedido en el panel", enlace)}</p>`,
  });
  const texto = `${asunto}\n${aviso}\n${o.customer?.email ?? "Sin correo de la clienta"}\n\n${tablaTexto(r)}\n\nVer en el panel: ${enlace}`;
  return { asunto, html, texto };
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
