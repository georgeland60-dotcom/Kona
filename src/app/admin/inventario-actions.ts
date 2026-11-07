"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isLoggedIn } from "@/lib/auth";
import {
  setStock,
  adjustStock,
  getProductById,
  getProducts,
  upsertProduct,
  skuFor,
} from "@/lib/store-data";
import { INVENTARIO_REAL, CORTE_INVENTARIO } from "@/data/inventario-real";

async function refresh(productId: string) {
  const p = await getProductById(productId);
  revalidatePath("/admin/inventario");
  revalidatePath("/admin");
  revalidatePath("/tienda");
  revalidatePath("/");
  if (p) revalidatePath(`/producto/${p.slug}`);
}

// Fija el stock de una talla a un valor exacto.
export async function setStockAction(formData: FormData) {
  if (!(await isLoggedIn())) redirect("/admin/login");
  const productId = String(formData.get("productId") || "");
  const sku = String(formData.get("sku") || "");
  const value = Number(formData.get("stock") || 0);
  if (productId && sku) {
    await setStock(productId, sku, value);
    await refresh(productId);
  }
}

// Suma o resta unidades de una talla (delta +1 / -1).
export async function adjustStockAction(formData: FormData) {
  if (!(await isLoggedIn())) redirect("/admin/login");
  const productId = String(formData.get("productId") || "");
  const sku = String(formData.get("sku") || "");
  const delta = Number(formData.get("delta") || 0);
  if (productId && sku && delta) {
    await adjustStock(productId, sku, delta);
    await refresh(productId);
  }
}

// ---- Traer el inventario de la tienda anterior ----------------------
//
//  La tienda nueva nació con 10 unidades inventadas de cada talla
//  porque al importar el catálogo no había stock de dónde sacarlo.
//  Esto pone lo que de verdad había en konamoda.pe al 1 de noviembre,
//  sacado del último backup.
//
//  Es un botón y no algo automático a propósito: cambia lo que se
//  puede vender de los 84 productos de golpe, y eso lo decide ella.
//  Se puede volver a apretar sin miedo (deja el mismo resultado), pero
//  pisa los ajustes de stock hechos a mano después.
export async function importarInventarioRealAction() {
  if (!(await isLoggedIn())) redirect("/admin/login");

  const productos = await getProducts({ includeInactive: true, raw: true });
  let tocados = 0;
  let unidades = 0;

  for (const producto of productos) {
    const real = INVENTARIO_REAL[producto.id];
    if (!real) continue; // uno que no estaba en la tienda anterior

    const variants = real.map(([size, stock]) => ({
      size,
      // El SKU se conserva si esa talla ya existía: es lo que enlaza el
      // stock con los pedidos que ya están hechos.
      sku:
        producto.variants.find((v) => v.size === size)?.sku ??
        skuFor(producto.slug, size),
      stock,
    }));

    await upsertProduct({ ...producto, variants });
    tocados++;
    unidades += variants.reduce((s, v) => s + v.stock, 0);
  }

  revalidatePath("/admin/inventario");
  revalidatePath("/admin");
  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
  revalidatePath("/");
  revalidatePath("/producto/[slug]", "page");

  redirect(`/admin/inventario?importado=${tocados}&unidades=${unidades}`);
}
