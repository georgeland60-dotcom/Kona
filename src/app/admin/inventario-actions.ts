"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isLoggedIn } from "@/lib/auth";
import {
  setStock,
  adjustStock,
  getProductById,
  rehacerInventarioReal,
} from "@/lib/store-data";

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
//  El stock real de konamoda.pe al 1 de noviembre, sacado del último
//  backup, se aplica solo la primera vez que alguien entra a la tienda
//  (lib/store-data.ts). Este botón lo vuelve a aplicar a mano: es el
//  botón de pánico si alguien se lía ajustando tallas.
//
//  Se puede apretar sin miedo (deja siempre el mismo resultado), pero
//  pisa los ajustes de stock hechos a mano después.
export async function importarInventarioRealAction() {
  if (!(await isLoggedIn())) redirect("/admin/login");

  const { productos, unidades, guardado } = await rehacerInventarioReal();

  revalidatePath("/admin/inventario");
  revalidatePath("/admin");
  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
  revalidatePath("/");
  revalidatePath("/producto/[slug]", "page");

  redirect(
    guardado
      ? `/admin/inventario?importado=${productos}&unidades=${unidades}`
      : "/admin/inventario?error=no-se-pudo-guardar"
  );
}
