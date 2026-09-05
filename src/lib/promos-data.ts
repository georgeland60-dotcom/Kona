// =============================================================
//  CAPA DE DATOS DE PROMOCIONES
//  Guarda en el documento "promos":
//   - banners: las diapositivas del slider del inicio
//   - rules:   reglas de descuento que se aplican solas a los precios
//   - seasons: bloques de temporada extra para el inicio (ej "Verano")
//  La primera vez se crea solo, copiando los banners de
//  data/banners.ts (la "semilla").
// =============================================================

import { banners as seedBanners } from "@/data/banners";
import type { Banner, DiscountRule, Product, SeasonBlock } from "@/lib/types";
import { precioVitrina } from "@/lib/promo-engine";
import { readDoc, writeDoc } from "@/lib/kv";

type PromosData = {
  banners: Banner[];
  rules: DiscountRule[];
  seasons: SeasonBlock[];
  updatedAt: string;
};

// ---- Lectura / escritura --------------------------------------------

// Datos "en fábrica" desde la semilla (banners.ts). Se usan mientras no se
// haya guardado nada todavía.
function seedData(): PromosData {
  return {
    banners: seedBanners.map((b, i) => ({
      id: `BAN-${i + 1}`,
      eyebrow: b.eyebrow,
      title: b.title,
      text: b.text,
      cta: b.cta,
      href: b.href,
      image: b.image,
      active: true,
    })),
    rules: [],
    seasons: [],
    updatedAt: new Date().toISOString(),
  };
}

async function readPromos(): Promise<PromosData> {
  const parsed = await readDoc<Partial<PromosData>>("promos", seedData);
  return {
    banners: parsed.banners ?? [],
    rules: parsed.rules ?? [],
    seasons: parsed.seasons ?? [],
    updatedAt: parsed.updatedAt ?? new Date().toISOString(),
  };
}

// Devuelve false si no se pudo guardar (disco de solo lectura y sin KV).
async function writePromos(data: PromosData): Promise<boolean> {
  data.updatedAt = new Date().toISOString();
  return writeDoc("promos", data);
}

// ---- BANNERS ---------------------------------------------------------

// Todos los banners (para el panel).
export async function getBanners(): Promise<Banner[]> {
  const { banners } = await readPromos();
  return banners;
}

// Solo los activos (para mostrar en la tienda).
export async function getActiveBanners(): Promise<Banner[]> {
  const { banners } = await readPromos();
  return banners.filter((b) => b.active);
}

export async function getBannerById(id: string): Promise<Banner | undefined> {
  const { banners } = await readPromos();
  return banners.find((b) => b.id === id);
}

export async function upsertBanner(banner: Banner): Promise<Banner> {
  const data = await readPromos();
  const idx = data.banners.findIndex((b) => b.id === banner.id);
  if (idx >= 0) data.banners[idx] = banner;
  else data.banners.push(banner);
  await writePromos(data);
  return banner;
}

export async function deleteBanner(id: string): Promise<void> {
  const data = await readPromos();
  data.banners = data.banners.filter((b) => b.id !== id);
  await writePromos(data);
}

export async function nextBannerId(): Promise<string> {
  const { banners } = await readPromos();
  const max = banners.reduce((m, b) => {
    const n = parseInt(b.id.replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `BAN-${max + 1}`;
}

// ---- TEMPORADAS ------------------------------------------------------
//  Un bloque de temporada agrupa productos por etiqueta de colección y
//  se muestra como una sección más del inicio.

export async function getSeasons(): Promise<SeasonBlock[]> {
  const { seasons } = await readPromos();
  return seasons;
}

export async function getActiveSeasons(): Promise<SeasonBlock[]> {
  const { seasons } = await readPromos();
  return seasons.filter((s) => s.active);
}

export async function getSeasonBySlug(
  slug: string
): Promise<SeasonBlock | undefined> {
  const { seasons } = await readPromos();
  return seasons.find((s) => s.slug === slug);
}

export async function upsertSeason(season: SeasonBlock): Promise<boolean> {
  const data = await readPromos();
  const idx = data.seasons.findIndex((s) => s.id === season.id);
  if (idx >= 0) data.seasons[idx] = season;
  else data.seasons.push(season);
  return writePromos(data);
}

export async function deleteSeason(id: string): Promise<boolean> {
  const data = await readPromos();
  data.seasons = data.seasons.filter((s) => s.id !== id);
  return writePromos(data);
}

export async function nextSeasonId(): Promise<string> {
  const { seasons } = await readPromos();
  const max = seasons.reduce((m, s) => {
    const n = parseInt(s.id.replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `TEM-${max + 1}`;
}

// ---- REGLAS DE DESCUENTO --------------------------------------------

export async function getRules(): Promise<DiscountRule[]> {
  const { rules } = await readPromos();
  return rules;
}

export async function getRuleById(
  id: string
): Promise<DiscountRule | undefined> {
  const { rules } = await readPromos();
  return rules.find((r) => r.id === id);
}

export async function upsertRule(rule: DiscountRule): Promise<DiscountRule> {
  const data = await readPromos();
  const idx = data.rules.findIndex((r) => r.id === rule.id);
  if (idx >= 0) data.rules[idx] = rule;
  else data.rules.push(rule);
  await writePromos(data);
  return rule;
}

export async function deleteRule(id: string): Promise<void> {
  const data = await readPromos();
  data.rules = data.rules.filter((r) => r.id !== id);
  await writePromos(data);
}

export async function nextRuleId(): Promise<string> {
  const { rules } = await readPromos();
  const max = rules.reduce((m, r) => {
    const n = parseInt(r.id.replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `DSC-${max + 1}`;
}

// ¿La regla está vigente hoy? (activa y dentro de fechas, si tiene).
function ruleIsLive(rule: DiscountRule, now: Date): boolean {
  if (!rule.active) return false;
  if (rule.startsAt && now < new Date(rule.startsAt)) return false;
  if (rule.endsAt && now > new Date(rule.endsAt)) return false;
  return true;
}

// Reglas vigentes ahora mismo.
export async function getLiveRules(): Promise<DiscountRule[]> {
  const { rules } = await readPromos();
  const now = new Date();
  return rules.filter((r) => ruleIsLive(r, now));
}

export type Priced = {
  price: number; // precio final a cobrar
  oldPrice?: number; // precio anterior tachado (si hay descuento)
  discounted: boolean;
};

// Calcula el precio que se MUESTRA de un producto.
//
// El cálculo vive en el motor de promociones (promo-engine), el mismo que
// usa el carrito. No es un detalle: cuando la vitrina tenía su propia
// versión, no entendía los filtros por lista ni las exclusiones, y una
// promoción de un solo producto se veía aplicada a toda la tienda aunque
// el carrito cobrara el precio entero.
export function priceFor(product: Product, liveRules: DiscountRule[]): Priced {
  const base = product.price;
  const price = precioVitrina(product, liveRules);

  if (price < base) {
    return { price, oldPrice: product.oldPrice ?? base, discounted: true };
  }
  return { price: base, oldPrice: product.oldPrice, discounted: false };
}

// Devuelve una copia del producto con el precio (y oldPrice) ya con
// descuento aplicado. Marca onSale si hubo descuento.
export function withDiscount(product: Product, liveRules: DiscountRule[]): Product {
  const p = priceFor(product, liveRules);
  if (!p.discounted) return product;
  return {
    ...product,
    price: p.price,
    oldPrice: p.oldPrice,
    onSale: true,
  };
}

// Aplica descuentos vigentes a una lista de productos (lee las reglas una vez).
export async function applyDiscounts(products: Product[]): Promise<Product[]> {
  const liveRules = await getLiveRules();
  if (liveRules.length === 0) return products;
  return products.map((p) => withDiscount(p, liveRules));
}
