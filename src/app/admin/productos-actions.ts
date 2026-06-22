"use server";

import { promises as fs } from "fs";
import path from "path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isLoggedIn } from "@/lib/auth";
import {
  upsertProduct,
  deleteProduct,
  getProductById,
  nextProductId,
  skuFor,
} from "@/lib/store-data";
import type { Product, Variant } from "@/lib/types";

// Texto -> slug en minúsculas (para URL del producto).
function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Guarda la foto subida en /public/products y devuelve su ruta pública.
async function saveImage(file: File, slug: string): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = /^(jpg|jpeg|png|webp|gif|avif)$/.test(ext) ? ext : "jpg";
  const filename = `${slug || "producto"}-${Date.now()}.${safeExt}`;
  const dir = path.join(process.cwd(), "public", "products");
  await fs.mkdir(dir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, filename), bytes);
  return `/products/${filename}`;
}

// Refresca las páginas públicas y del panel tras un cambio.
function revalidateAll(slug?: string) {
  revalidatePath("/");
  revalidatePath("/tienda");
  revalidatePath("/admin");
  revalidatePath("/admin/productos");
  revalidatePath("/admin/inventario");
  if (slug) revalidatePath(`/producto/${slug}`);
}

// Crea o actualiza un producto desde el formulario.
export async function saveProductAction(formData: FormData) {
  if (!(await isLoggedIn())) redirect("/admin/login");

  const id = String(formData.get("id") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const slugInput = String(formData.get("slug") || "").trim();
  const slug = slugify(slugInput || name);
  const price = Number(formData.get("price") || 0);
  const category = String(formData.get("category") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const oldPriceRaw = String(formData.get("oldPrice") || "").trim();
  const oldPrice = oldPriceRaw ? Number(oldPriceRaw) : undefined;
  const featured = formData.get("featured") === "on";
  const onSale = formData.get("onSale") === "on";
  const active = formData.get("active") === "on";

  // Tallas + stock (vienen en arreglos paralelos del editor de variantes).
  const sizes = formData.getAll("variant_size").map((s) => String(s).trim());
  const stocks = formData.getAll("variant_stock").map((s) => Number(s) || 0);
  const variants: Variant[] = [];
  sizes.forEach((size, i) => {
    if (!size) return;
    variants.push({ size, sku: skuFor(slug, size), stock: Math.max(0, stocks[i] ?? 0) });
  });

  // Foto: si suben una nueva, la guardamos; si no, mantenemos la actual.
  const file = formData.get("image") as File | null;
  const currentImage = String(formData.get("current_image") || "").trim();
  const uploaded = file ? await saveImage(file, slug) : null;
  const image = uploaded || currentImage || undefined;

  const finalId = id || (await nextProductId());

  const product: Product = {
    id: finalId,
    slug,
    name,
    price,
    category,
    image,
    description: description || undefined,
    variants,
    featured,
    onSale,
    oldPrice: oldPrice && oldPrice > 0 ? oldPrice : undefined,
    active,
  };

  await upsertProduct(product);
  revalidateAll(slug);
  redirect("/admin/productos");
}

// Borra un producto.
export async function deleteProductAction(formData: FormData) {
  if (!(await isLoggedIn())) redirect("/admin/login");
  const id = String(formData.get("id") || "").trim();
  if (id) {
    const p = await getProductById(id, { raw: true });
    await deleteProduct(id);
    revalidateAll(p?.slug);
  }
  redirect("/admin/productos");
}
