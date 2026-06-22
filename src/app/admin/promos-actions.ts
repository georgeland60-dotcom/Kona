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
} from "@/lib/promos-data";
import type { Banner, DiscountRule, DiscountKind, DiscountScope } from "@/lib/types";

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

export async function saveRuleAction(formData: FormData) {
  if (!(await isLoggedIn())) redirect("/admin/login");

  const id = String(formData.get("id") || "").trim();
  const name = String(formData.get("name") || "").trim() || "Descuento";
  const scope = String(formData.get("scope") || "all") as DiscountScope;
  const kind = String(formData.get("kind") || "percent") as DiscountKind;
  const value = Math.max(0, Number(formData.get("value") || 0));
  const active = formData.get("active") === "on";

  // El target depende del alcance.
  let target: string | undefined;
  if (scope === "category") target = String(formData.get("targetCategory") || "").trim() || undefined;
  else if (scope === "product") target = String(formData.get("targetProduct") || "").trim() || undefined;

  const startsAt = String(formData.get("startsAt") || "").trim() || undefined;
  const endsAt = String(formData.get("endsAt") || "").trim() || undefined;

  const rule: DiscountRule = {
    id: id || (await nextRuleId()),
    name,
    scope,
    target,
    kind,
    value,
    active,
    startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
    endsAt: endsAt ? new Date(endsAt + "T23:59:59").toISOString() : undefined,
  };

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
