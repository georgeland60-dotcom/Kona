"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isLoggedIn } from "@/lib/auth";
import { setStock, adjustStock, getProductById } from "@/lib/store-data";

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
