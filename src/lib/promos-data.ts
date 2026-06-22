// =============================================================
//  CAPA DE DATOS DE PROMOCIONES
//  Guarda en data/promos.json:
//   - banners: las diapositivas del slider del inicio
//   - rules:   reglas de descuento que se aplican solas a los precios
//  La primera vez se crea solo, copiando los banners de
//  data/banners.ts (la "semilla").
// =============================================================

import { promises as fs } from "fs";
import path from "path";
import { banners as seedBanners } from "@/data/banners";
import type { Banner, DiscountRule, Product } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const PROMOS_FILE = path.join(DATA_DIR, "promos.json");

type PromosData = {
  banners: Banner[];
  rules: DiscountRule[];
  updatedAt: string;
};

// ---- Lectura / escritura --------------------------------------------

async function ensureSeed(): Promise<PromosData> {
  const data: PromosData = {
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
    updatedAt: new Date().toISOString(),
  };
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(PROMOS_FILE, JSON.stringify(data, null, 2), "utf8");
  return data;
}

async function readPromos(): Promise<PromosData> {
  try {
    const raw = await fs.readFile(PROMOS_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<PromosData>;
    return {
      banners: parsed.banners ?? [],
      rules: parsed.rules ?? [],
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return ensureSeed();
  }
}

async function writePromos(data: PromosData): Promise<void> {
  data.updatedAt = new Date().toISOString();
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(PROMOS_FILE, JSON.stringify(data, null, 2), "utf8");
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

// ¿Esta regla aplica a este producto?
function ruleMatchesProduct(rule: DiscountRule, product: Product): boolean {
  if (rule.scope === "all") return true;
  if (rule.scope === "category") return product.category === rule.target;
  if (rule.scope === "product") return product.id === rule.target;
  return false;
}

// Precio que cobra una regla sobre un precio base.
function applyRule(rule: DiscountRule, base: number): number {
  if (rule.kind === "percent") {
    return base * (1 - rule.value / 100);
  }
  return base - rule.value;
}

export type Priced = {
  price: number; // precio final a cobrar
  oldPrice?: number; // precio anterior tachado (si hay descuento)
  discounted: boolean;
};

// Calcula el precio final de un producto aplicando la MEJOR regla vigente
// (la que más conviene al cliente). Función pura: recibe las reglas ya
// filtradas como vigentes.
export function priceFor(product: Product, liveRules: DiscountRule[]): Priced {
  const base = product.price;
  let best = base;
  for (const rule of liveRules) {
    if (!ruleMatchesProduct(rule, product)) continue;
    const candidate = applyRule(rule, base);
    if (candidate < best) best = candidate;
  }
  if (best < base) {
    const price = Math.max(1, Math.round(best));
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
