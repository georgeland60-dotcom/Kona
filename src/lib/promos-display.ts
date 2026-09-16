// =============================================================
//  PROMOCIONES PARA MOSTRAR AL CLIENTE
//  Toma lo que ya existe en el panel (las reglas de descuento
//  vigentes y los banners activos) y lo convierte en una lista
//  simple y legible para el pop-up del inicio.
//  Es dinamico: lo que se prende o apaga en /admin sale aqui.
// =============================================================

import { categories } from "@/data/categories";
import { formatPrice } from "@/lib/format";
import type { Banner, DiscountRule, Product } from "@/lib/types";

export type PromoItem = {
  id: string;
  title: string; // lo grande, ej "20% de descuento"
  detail: string; // a que aplica, ej "en Vestidos"
  href: string;
  image?: string;
  cta: string;
};

function categoryName(slug: string): string {
  return categories.find((c) => c.slug === slug)?.name ?? slug;
}

// "20% de descuento" / "S/ 30.00 de descuento"
function ruleTitle(rule: DiscountRule): string {
  return rule.kind === "percent"
    ? `${rule.value}% de descuento`
    : `${formatPrice(rule.value)} de descuento`;
}

// "en toda la tienda" / "en Vestidos" / "en Vestido Dreams"
function ruleDetail(rule: DiscountRule, products: Product[]): string {
  if (rule.scope === "all") return "En toda la tienda";
  if (rule.scope === "category") {
    return `En ${categoryName(rule.target ?? "")}`;
  }
  const product = products.find((p) => p.id === rule.target);
  return product ? `En ${product.name}` : "Promoción especial";
}

// A donde lleva el boton de la promocion.
function ruleHref(rule: DiscountRule, products: Product[]): string {
  if (rule.scope === "category" && rule.target) {
    return `/tienda?cat=${rule.target}`;
  }
  if (rule.scope === "product") {
    const product = products.find((p) => p.id === rule.target);
    if (product) return `/producto/${product.slug}`;
  }
  return "/tienda";
}

// Arma la lista completa de promociones vigentes.
// Recibe los datos ya leidos para no repetir lecturas de disco.
export function buildPromos(
  liveRules: DiscountRule[],
  activeBanners: Banner[],
  products: Product[]
): PromoItem[] {
  const deReglas: PromoItem[] = liveRules.map((rule) => ({
    id: rule.id,
    title: ruleTitle(rule),
    detail: ruleDetail(rule, products),
    href: ruleHref(rule, products),
    cta: "Ver productos",
  }));

  const deBanners: PromoItem[] = activeBanners.map((banner) => ({
    id: banner.id,
    title: banner.title,
    detail: banner.text || banner.eyebrow,
    href: banner.href || "/tienda",
    image: banner.image,
    cta: banner.cta || "Ver mas",
  }));

  // Los descuentos van primero: son lo que mas mueve la compra.
  return [...deReglas, ...deBanners];
}
