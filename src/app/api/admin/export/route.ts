// =============================================================
//  DESCARGA DE DATOS EN CSV
//
//  Genera archivos abribles en Excel con el estado de la tienda:
//  productos, pedidos, ventas (línea a línea) e historial de cambios.
//  Solo para quien tiene sesión de admin.
//
//    /api/admin/export?tipo=productos
// =============================================================

import { isLoggedIn } from "@/lib/auth";
import { getProducts } from "@/lib/store-data";
import { getOrders } from "@/lib/orders-data";
import { getHistorial } from "@/lib/historial-data";
import { categories } from "@/data/categories";

type Fila = Record<string, string | number>;

// Escapa un valor para CSV: entrecomilla si trae comas, comillas o saltos
// de línea, que es justo lo que rompe estos archivos al abrirlos.
function celda(valor: string | number): string {
  const s = String(valor ?? "");
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function aCSV(filas: Fila[]): string {
  if (filas.length === 0) return "";
  const columnas = Object.keys(filas[0]);
  const lineas = [
    columnas.join(";"),
    ...filas.map((f) => columnas.map((c) => celda(f[c])).join(";")),
  ];
  // Separador ";" y BOM al inicio: así Excel en español abre el archivo en
  // columnas y respeta las tildes, sin tener que importarlo a mano.
  return "﻿" + lineas.join("\r\n");
}

function fecha(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("es-PE");
}

const nombreCategoria = (slug: string) =>
  categories.find((c) => c.slug === slug)?.name ?? slug;

async function filasProductos(): Promise<Fila[]> {
  const productos = await getProducts({ includeInactive: true, raw: true });
  return productos.map((p) => ({
    id: p.id,
    nombre: p.name,
    categoria: nombreCategoria(p.category),
    precio: p.price,
    precio_anterior: p.oldPrice ?? "",
    en_oferta: p.onSale ? "sí" : "no",
    destacado: p.featured ? "sí" : "no",
    visible: p.active === false ? "no" : "sí",
    stock_total: p.variants.reduce((s, v) => s + v.stock, 0),
    tallas: p.variants.map((v) => `${v.size}:${v.stock}`).join(" | "),
    colecciones: (p.collections ?? []).join(" | "),
    enlace: `/producto/${p.slug}`,
  }));
}

async function filasPedidos(): Promise<Fila[]> {
  const pedidos = await getOrders();
  return pedidos.map((o) => ({
    pedido: o.id,
    fecha: fecha(o.createdAt),
    estado: o.status,
    metodo: o.method,
    total: o.total,
    articulos: o.items.reduce((s, i) => s + i.qty, 0),
    cliente: o.customer?.name ?? "",
    telefono: o.customer?.phone ?? "",
    email: o.customer?.email ?? "",
  }));
}

// Una fila por producto vendido, no por pedido: así se puede sumar y
// dinamizar en Excel (qué se vende más, cuánto deja cada talla).
async function filasVentas(): Promise<Fila[]> {
  const pedidos = await getOrders({ status: "pagado" });
  const filas: Fila[] = [];
  for (const o of pedidos) {
    for (const i of o.items) {
      filas.push({
        pedido: o.id,
        fecha: fecha(o.createdAt),
        producto: i.name,
        talla: i.size ?? "",
        cantidad: i.qty,
        precio_unitario: i.price,
        subtotal: i.price * i.qty,
        metodo: o.method,
      });
    }
  }
  return filas;
}

async function filasCambios(): Promise<Fila[]> {
  const cambios = await getHistorial();
  return cambios.map((c) => ({
    fecha: fecha(c.fecha),
    quien: c.quien,
    origen: c.origen,
    tipo: c.tipo,
    categoria: c.categoria === "todas" ? "toda la tienda" : nombreCategoria(c.categoria),
    cambio: c.resumen,
    resultado: c.detalle,
    aplicado: c.ok ? "sí" : "no",
  }));
}

const FUENTES: Record<string, () => Promise<Fila[]>> = {
  productos: filasProductos,
  pedidos: filasPedidos,
  ventas: filasVentas,
  cambios: filasCambios,
};

export async function GET(req: Request) {
  if (!(await isLoggedIn())) {
    return new Response("No autorizado", { status: 401 });
  }

  const tipo = new URL(req.url).searchParams.get("tipo") ?? "";
  const fuente = FUENTES[tipo];
  if (!fuente) {
    return Response.json(
      { error: `Tipo no válido. Usa: ${Object.keys(FUENTES).join(", ")}.` },
      { status: 400 }
    );
  }

  const filas = await fuente();
  const hoy = new Date().toISOString().slice(0, 10);

  // Sin datos igual devolvemos un archivo, con la cabecera, para que no
  // parezca que la descarga falló.
  const csv =
    filas.length > 0 ? aCSV(filas) : "﻿sin datos todavía";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kona-${tipo}-${hoy}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
