"use server";

import { promises as fs } from "fs";
import path from "path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isLoggedIn } from "@/lib/auth";
import {
  upsertBanner,
  deleteBanner,
  getBannerById,
  nextBannerId,
  upsertRule,
  deleteRule,
  nextRuleId,
  getRuleById,
} from "@/lib/promos-data";
import type {
  Banner,
  CondicionCarrito,
  DiscountRule,
  DiscountKind,
  DiscountScope,
  DiscountType,
  Filtro,
  Tramo,
} from "@/lib/types";

// Guarda una foto subida en /public/banners y devuelve su ruta pública.
async function saveImage(file: File): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = /^(jpg|jpeg|png|webp|gif|avif)$/.test(ext) ? ext : "jpg";
  const filename = `banner-${Date.now()}.${safeExt}`;
  const dir = path.join(process.cwd(), "public", "banners");
  await fs.mkdir(dir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, filename), bytes);
  return `/banners/${filename}`;
}

function revalidateStore() {
  revalidatePath("/");
  // La tienda y TODAS las fichas de producto: un descuento cambia los
  // precios que se ven ahí. Sin esto, se creaba la promoción, el
  // carrito la cobraba y la vitrina seguía enseñando el precio viejo
  // —que es exactamente el aspecto de "no funciona".
  revalidatePath("/tienda");
  revalidatePath("/producto/[slug]", "page");
  revalidatePath("/admin/promociones");
  revalidatePath("/admin/descuentos");
}

// ---- BANNERS ---------------------------------------------------------

export async function saveBannerAction(formData: FormData) {
  if (!(await isLoggedIn())) redirect("/admin/login");

  const id = String(formData.get("id") || "").trim();
  const eyebrow = String(formData.get("eyebrow") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const text = String(formData.get("text") || "").trim();
  const cta = String(formData.get("cta") || "").trim() || "Ver más";
  const href = String(formData.get("href") || "").trim() || "/tienda";
  const active = formData.get("active") === "on";
  const imagePath = String(formData.get("imagePath") || "").trim();

  const file = formData.get("imageFile") as File | null;
  const uploaded = file ? await saveImage(file) : null;

  let prev: Banner | undefined;
  if (id) prev = await getBannerById(id);

  const image = uploaded || imagePath || prev?.image || "";

  const banner: Banner = {
    id: id || (await nextBannerId()),
    eyebrow,
    title,
    text,
    cta,
    href,
    image,
    active,
  };

  await upsertBanner(banner);
  revalidateStore();
  redirect("/admin/promociones");
}

export async function deleteBannerAction(formData: FormData) {
  if (!(await isLoggedIn())) redirect("/admin/login");
  const id = String(formData.get("id") || "").trim();
  if (id) await deleteBanner(id);
  revalidateStore();
  redirect("/admin/promociones");
}

// ---- REGLAS DE DESCUENTO --------------------------------------------
//
//  El formulario del panel ya sabe armar TODO lo que el motor entiende:
//  descuento directo, 2x1, por cantidad, sobre el total y envío gratis,
//  con listas y exclusiones. Antes solo entendía "un % sobre una
//  categoría" y lo demás había que pedírselo al asistente por Telegram.
//
//  Lo que se guarda se valida aquí, no en el navegador: el formulario
//  es solo la pantalla, y cualquiera puede mandar otra cosa.

function numeroOpcional(formData: FormData, campo: string): number | undefined {
  const bruto = String(formData.get(campo) ?? "").trim();
  if (!bruto) return undefined;
  const n = Number(bruto);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function listaDe(formData: FormData, campo: string): string[] {
  return formData
    .getAll(campo)
    .map((v) => String(v).trim())
    .filter(Boolean);
}

// A qué productos apunta la regla. Se guarda siempre como "filtro"
// (listas + exclusiones), que es lo que entiende el motor, y además se
// deja scope/target coherentes para lo que todavía los lee.
function leerFiltro(formData: FormData): {
  filtro?: Filtro;
  scope: DiscountScope;
  target?: string;
} {
  const alcance = String(formData.get("alcance") || "todos");
  const categorias = listaDe(formData, "categorias");
  const productos = listaDe(formData, "productos");
  const excluirCategorias = listaDe(formData, "excluirCategorias");
  const excluirProductos = listaDe(formData, "excluirProductos");

  const filtro: Filtro = {};
  if (alcance === "categorias" && categorias.length > 0) filtro.categorias = categorias;
  else if (alcance === "productos" && productos.length > 0) filtro.productos = productos;
  else filtro.todos = true;

  if (excluirCategorias.length > 0) filtro.excluirCategorias = excluirCategorias;
  if (excluirProductos.length > 0) filtro.excluirProductos = excluirProductos;

  // scope/target siguen poniéndose por compatibilidad: una regla de una
  // sola categoría o un solo producto se lee igual que siempre.
  const scope: DiscountScope = filtro.categorias?.length
    ? "category"
    : filtro.productos?.length
      ? "product"
      : "all";
  const target =
    scope === "category"
      ? filtro.categorias![0]
      : scope === "product"
        ? filtro.productos![0]
        : undefined;

  return { filtro, scope, target };
}

// La condición que activa una promoción de total o de envío.
function leerCondicion(formData: FormData): CondicionCarrito | undefined {
  const categorias = listaDe(formData, "condicionCategorias");
  const cantidadMinima = numeroOpcional(formData, "cantidadMinima");
  const subtotalMinimo = numeroOpcional(formData, "subtotalMinimo");

  const condicion: CondicionCarrito = {};
  if (categorias.length > 0) condicion.categorias = categorias;
  if (cantidadMinima) condicion.cantidadMinima = cantidadMinima;
  if (subtotalMinimo) condicion.subtotalMinimo = subtotalMinimo;

  return Object.keys(condicion).length > 0 ? condicion : undefined;
}

// Los tramos del descuento por cantidad. Vienen como columnas paralelas
// (todos los "desde", todos los "hasta"...), que es como manda un
// formulario con filas repetidas.
function leerTramos(formData: FormData): Tramo[] {
  const desde = formData.getAll("tramoDesde");
  const hasta = formData.getAll("tramoHasta");
  const kinds = formData.getAll("tramoKind");
  const valores = formData.getAll("tramoValue");

  const tramos: Tramo[] = [];
  for (let i = 0; i < desde.length; i++) {
    const d = Number(desde[i]);
    const v = Number(valores[i]);
    if (!Number.isFinite(d) || d < 1) continue;
    if (!Number.isFinite(v) || v < 0) continue;
    const h = Number(hasta[i]);
    tramos.push({
      desde: Math.floor(d),
      ...(Number.isFinite(h) && h >= d ? { hasta: Math.floor(h) } : {}),
      kind: String(kinds[i] || "percent") as DiscountKind,
      value: v,
    });
  }
  // De menor a mayor: así se leen en el panel y así se eligen.
  return tramos.sort((a, b) => a.desde - b.desde);
}

export async function saveRuleAction(formData: FormData) {
  if (!(await isLoggedIn())) redirect("/admin/login");

  const id = String(formData.get("id") || "").trim();
  const name = String(formData.get("name") || "").trim() || "Descuento";
  const tipo = String(formData.get("tipo") || "simple") as DiscountType;
  const active = formData.get("active") === "on";
  const kind = String(formData.get("kind") || "percent") as DiscountKind;
  const value = Math.max(0, Number(formData.get("value") || 0));

  const startsAt = String(formData.get("startsAt") || "").trim() || undefined;
  const endsAt = String(formData.get("endsAt") || "").trim() || undefined;

  const previa = id ? await getRuleById(id) : undefined;

  // Lo común a todas.
  const base: DiscountRule = {
    id: id || (await nextRuleId()),
    name,
    tipo,
    active,
    scope: "all",
    kind,
    value,
    startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
    endsAt: endsAt ? new Date(endsAt + "T23:59:59").toISOString() : undefined,
  };

  // Y lo propio de cada clase. Se arma desde cero en vez de mezclar con
  // la regla anterior: si no, al cambiar un 2x1 a "descuento directo"
  // se quedarían dentro los datos del 2x1 y seguiría regalando unidades.
  let rule: DiscountRule;

  if (tipo === "envio") {
    const destinos = listaDe(formData, "envioDestinos");
    rule = {
      ...base,
      kind: "percent",
      value: 0,
      envio: {
        ...(leerCondicion(formData) ? { condicion: leerCondicion(formData)! } : {}),
        ...(destinos.length > 0 ? { destinos } : {}),
      },
    };
  } else if (tipo === "carrito") {
    const maximoDescuento = numeroOpcional(formData, "maximoDescuento");
    rule = {
      ...base,
      // Un "precio final" no significa nada sobre un total.
      kind: kind === "fixed" ? "fixed" : "percent",
      carrito: {
        ...(leerCondicion(formData) ? { condicion: leerCondicion(formData)! } : {}),
        ...(maximoDescuento ? { maximoDescuento } : {}),
      },
    };
  } else {
    const { filtro, scope, target } = leerFiltro(formData);
    rule = { ...base, scope, target, filtro };

    if (tipo === "bogo") {
      const porCada = Math.max(1, Math.floor(Number(formData.get("porCada") || 2)));
      const regala = Math.max(1, Math.floor(Number(formData.get("regala") || 1)));
      const descuentoRegalo = Math.min(
        100,
        Math.max(1, Number(formData.get("descuentoRegalo") || 100))
      );
      const maximoRegalos = numeroOpcional(formData, "maximoRegalos");
      rule = {
        ...rule,
        kind: "percent",
        value: 0,
        bogo: {
          porCada,
          regala,
          descuentoRegalo,
          recursivo: formData.get("recursivo") === "on",
          ...(maximoRegalos ? { maximoRegalos: Math.floor(maximoRegalos) } : {}),
        },
      };
    } else if (tipo === "escalonado") {
      const tramos = leerTramos(formData);
      // Sin tramos no descontaría nada; se conservan los de antes para
      // no dejar la promoción muda por un formulario mal mandado.
      rule = {
        ...rule,
        kind: "percent",
        value: 0,
        tramos: tramos.length > 0 ? tramos : (previa?.tramos ?? []),
      };
    }
  }

  await upsertRule(rule);
  revalidateStore();
  redirect("/admin/descuentos");
}

export async function deleteRuleAction(formData: FormData) {
  if (!(await isLoggedIn())) redirect("/admin/login");
  const id = String(formData.get("id") || "").trim();
  if (id) await deleteRule(id);
  revalidateStore();
  redirect("/admin/descuentos");
}
