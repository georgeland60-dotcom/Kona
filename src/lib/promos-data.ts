// =============================================================
//  CAPA DE DATOS DE PROMOCIONES (banners + reglas de descuento)
//  Ahora usa SQLite (ver src/lib/db.ts). Los banners iniciales se
//  siembran desde data/banners.ts la primera vez (en db.ts).
//  Las funciones de cálculo de precio son puras (no tocan la base).
// =============================================================

import type { Banner, DiscountRule, Product } from "@/lib/types";
import { getDb } from "@/lib/db";

// ---- BANNERS ---------------------------------------------------------

type BannerRow = {
  id: string;
  ord: number;
  eyebrow: string;
  title: string;
  text: string;
  cta: string;
  href: string;
  image: string;
  active: number;
};

function rowToBanner(r: BannerRow): Banner {
  return {
    id: r.id,
    eyebrow: r.eyebrow,
    title: r.title,
    text: r.text,
    cta: r.cta,
    href: r.href,
    image: r.image,
    active: r.active === 1,
  };
}

// Todos los banners (para el panel).
export async function getBanners(): Promise<Banner[]> {
  const rows = getDb()
    .prepare("SELECT * FROM banners ORDER BY ord, id")
    .all() as BannerRow[];
  return rows.map(rowToBanner);
}

// Solo los activos (para mostrar en la tienda).
export async function getActiveBanners(): Promise<Banner[]> {
  const rows = getDb()
    .prepare("SELECT * FROM banners WHERE active = 1 ORDER BY ord, id")
    .all() as BannerRow[];
  return rows.map(rowToBanner);
}

export async function getBannerById(id: string): Promise<Banner | undefined> {
  const row = getDb()
    .prepare("SELECT * FROM banners WHERE id = ?")
    .get(id) as BannerRow | undefined;
  return row ? rowToBanner(row) : undefined;
}

export async function upsertBanner(banner: Banner): Promise<Banner> {
  const db = getDb();
  const existing = db
    .prepare("SELECT ord FROM banners WHERE id = ?")
    .get(banner.id) as { ord: number } | undefined;
  const ord =
    existing?.ord ??
    (db.prepare("SELECT COALESCE(MAX(ord), -1) + 1 AS next FROM banners").get() as {
      next: number;
    }).next;

  db.prepare(
    `INSERT INTO banners (id, ord, eyebrow, title, text, cta, href, image, active)
     VALUES (@id, @ord, @eyebrow, @title, @text, @cta, @href, @image, @active)
     ON CONFLICT(id) DO UPDATE SET
       eyebrow=excluded.eyebrow, title=excluded.title, text=excluded.text,
       cta=excluded.cta, href=excluded.href, image=excluded.image,
       active=excluded.active`
  ).run({
    id: banner.id,
    ord,
    eyebrow: banner.eyebrow,
    title: banner.title,
    text: banner.text,
    cta: banner.cta,
    href: banner.href,
    image: banner.image,
    active: banner.active ? 1 : 0,
  });
  return banner;
}

export async function deleteBanner(id: string): Promise<void> {
  getDb().prepare("DELETE FROM banners WHERE id = ?").run(id);
}

export async function nextBannerId(): Promise<string> {
  const rows = getDb().prepare("SELECT id FROM banners").all() as { id: string }[];
  const max = rows.reduce((m, b) => {
    const n = parseInt(b.id.replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `BAN-${max + 1}`;
}

// ---- REGLAS DE DESCUENTO --------------------------------------------

type RuleRow = {
  id: string;
  ord: number;
  name: string;
  scope: DiscountRule["scope"];
  target: string | null;
  kind: DiscountRule["kind"];
  value: number;
  active: number;
  startsAt: string | null;
  endsAt: string | null;
};

function rowToRule(r: RuleRow): DiscountRule {
  const rule: DiscountRule = {
    id: r.id,
    name: r.name,
    scope: r.scope,
    kind: r.kind,
    value: r.value,
    active: r.active === 1,
  };
  if (r.target != null) rule.target = r.target;
  if (r.startsAt != null) rule.startsAt = r.startsAt;
  if (r.endsAt != null) rule.endsAt = r.endsAt;
  return rule;
}

export async function getRules(): Promise<DiscountRule[]> {
  const rows = getDb()
    .prepare("SELECT * FROM discount_rules ORDER BY ord, id")
    .all() as RuleRow[];
  return rows.map(rowToRule);
}

export async function getRuleById(
  id: string
): Promise<DiscountRule | undefined> {
  const row = getDb()
    .prepare("SELECT * FROM discount_rules WHERE id = ?")
    .get(id) as RuleRow | undefined;
  return row ? rowToRule(row) : undefined;
}

export async function upsertRule(rule: DiscountRule): Promise<DiscountRule> {
  const db = getDb();
  const existing = db
    .prepare("SELECT ord FROM discount_rules WHERE id = ?")
    .get(rule.id) as { ord: number } | undefined;
  const ord =
    existing?.ord ??
    (
      db
        .prepare("SELECT COALESCE(MAX(ord), -1) + 1 AS next FROM discount_rules")
        .get() as { next: number }
    ).next;

  db.prepare(
    `INSERT INTO discount_rules
       (id, ord, name, scope, target, kind, value, active, startsAt, endsAt)
     VALUES
       (@id, @ord, @name, @scope, @target, @kind, @value, @active, @startsAt, @endsAt)
     ON CONFLICT(id) DO UPDATE SET
       name=excluded.name, scope=excluded.scope, target=excluded.target,
       kind=excluded.kind, value=excluded.value, active=excluded.active,
       startsAt=excluded.startsAt, endsAt=excluded.endsAt`
  ).run({
    id: rule.id,
    ord,
    name: rule.name,
    scope: rule.scope,
    target: rule.target ?? null,
    kind: rule.kind,
    value: rule.value,
    active: rule.active ? 1 : 0,
    startsAt: rule.startsAt ?? null,
    endsAt: rule.endsAt ?? null,
  });
  return rule;
}

export async function deleteRule(id: string): Promise<void> {
  getDb().prepare("DELETE FROM discount_rules WHERE id = ?").run(id);
}

export async function nextRuleId(): Promise<string> {
  const rows = getDb()
    .prepare("SELECT id FROM discount_rules")
    .all() as { id: string }[];
  const max = rows.reduce((m, r) => {
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
  const rules = await getRules();
  const now = new Date();
  return rules.filter((r) => ruleIsLive(r, now));
}

// ---- CÁLCULO DE PRECIOS (funciones puras) ---------------------------

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
