// =============================================================
//  PROMOCIONES COMO GANCHO DE VENTA
//  Convierte las reglas vigentes del panel en un mensaje corto y
//  concreto: "2x1 en Chompas", "20% OFF en Vestidos", "Todo a S/ 89".
//  Nada se inventa: el gancho se arma leyendo la MISMA regla que
//  luego cobra el carrito, asi que lo que se promete es lo que se
//  cobra. Si una promocion se queda sin stock, no se anuncia.
// =============================================================

import { formatPrice } from "@/lib/format";
import { aplicaAlProducto, stockDisponible } from "@/lib/promo-engine";
import type { Banner, Category, DiscountRule, Product } from "@/lib/types";

// Por debajo de estas unidades el pop-up avisa que queda poco. Es el
// empujon final ("quedan 2!"), pero solo cuando es verdad.
const UMBRAL_POCAS_UNIDADES = 6;

export type PromoItem = {
  id: string;
  title: string; // el gancho grande, ej "2x1"
  detail: string; // la condicion, ej "Llevando 2, la 2da gratis"
  scope: string; // donde aplica, ej "en Chompas"
  urgency?: string; // ej "Solo quedan 2 unidades"
  href: string;
  image?: string;
  cta: string;
};

// ---- El gancho: lo que se lee en grande ------------------------------

function gancho(rule: DiscountRule): string {
  // Un 2x1 no tiene porcentaje: su "value" es 0 y diria "0% OFF".
  if (rule.tipo === "bogo" && rule.bogo) {
    const { porCada, regala, descuentoRegalo } = rule.bogo;
    if (descuentoRegalo >= 100) return `${porCada}x${porCada - regala}`;
    return `${descuentoRegalo}% OFF en la ${porCada}ª`;
  }

  // Un escalonado son varios escalones: se anuncia el mejor.
  if (rule.tipo === "escalonado" && rule.tramos?.length) {
    const mejorPct = Math.max(
      0,
      ...rule.tramos.filter((t) => t.kind === "percent").map((t) => t.value)
    );
    if (mejorPct > 0) return `Hasta ${mejorPct}% OFF`;
    const mejorFijo = Math.max(0, ...rule.tramos.map((t) => t.value));
    return `Hasta ${formatPrice(mejorFijo)} OFF`;
  }

  if (rule.kind === "precio_fijo") return `Todo a ${formatPrice(rule.value)}`;
  if (rule.kind === "percent") return `${rule.value}% OFF`;
  return `${formatPrice(rule.value)} OFF`;
}

// ---- La condicion: la letra chica que evita malentendidos ------------

function detalle(rule: DiscountRule): string {
  if (rule.tipo === "bogo" && rule.bogo) {
    const { porCada, regala, descuentoRegalo } = rule.bogo;
    const que = regala === 1 ? "la siguiente" : `las siguientes ${regala}`;
    return descuentoRegalo >= 100
      ? `Llevando ${porCada}, ${que} va gratis`
      : `Llevando ${porCada}, ${que} al ${descuentoRegalo}% OFF`;
  }

  if (rule.tipo === "carrito") {
    const c = rule.carrito?.condicion;
    const partes: string[] = [];
    if (c?.cantidadMinima) {
      partes.push(
        c.cantidadMinima === 1
          ? "En toda la compra"
          : `Llevando ${c.cantidadMinima} prendas o más`
      );
    }
    if (c?.subtotalMinimo) {
      partes.push(`En compras desde ${formatPrice(c.subtotalMinimo)}`);
    }
    if (partes.length === 0) partes.push("Sobre el total de tu compra");
    if (rule.carrito?.maximoDescuento) {
      partes.push(`máximo ${formatPrice(rule.carrito.maximoDescuento)}`);
    }
    return partes.join(" · ");
  }

  if (rule.tipo === "escalonado" && rule.tramos?.length) {
    return rule.tramos
      .map(
        (t) =>
          `${t.desde}+ u: ${
            t.kind === "percent" ? `${t.value}%` : formatPrice(t.value)
          }`
      )
      .join(" · ");
  }

  return "Precio ya rebajado en la tienda";
}

// ---- Donde aplica ----------------------------------------------------

function nombresCategorias(slugs: string[], categorias: Category[]): string {
  return slugs
    .map((s) => categorias.find((c) => c.slug === s)?.name ?? s)
    .join(", ");
}

function alcance(
  rule: DiscountRule,
  categorias: Category[],
  products: Product[]
): string {
  const f = rule.filtro;
  if (f) {
    if (f.todos) return "En toda la tienda";
    if (f.categorias?.length) {
      return `En ${nombresCategorias(f.categorias, categorias)}`;
    }
    if (f.productos?.length === 1) {
      const p = products.find((x) => x.id === f.productos?.[0]);
      if (p) return `En ${p.name}`;
    }
    if (f.productos?.length) return `En ${f.productos.length} prendas`;
  }
  if (rule.scope === "all") return "En toda la tienda";
  if (rule.scope === "category") {
    return `En ${nombresCategorias([rule.target ?? ""], categorias)}`;
  }
  const p = products.find((x) => x.id === rule.target);
  return p ? `En ${p.name}` : "Promoción especial";
}

// ---- Urgencia: solo si es cierta -------------------------------------

// Unidades que quedan entre los productos a los que apunta la regla.
function unidadesEnJuego(rule: DiscountRule, products: Product[]): number {
  return products
    .filter((p) => aplicaAlProducto(rule, p))
    .reduce((sum, p) => sum + stockDisponible(p), 0);
}

function urgencia(unidades: number): string | undefined {
  if (unidades <= 0 || unidades >= UMBRAL_POCAS_UNIDADES) return undefined;
  return unidades === 1 ? "Queda 1 unidad" : `Solo quedan ${unidades} unidades`;
}

// ---- A donde lleva ---------------------------------------------------

function destino(rule: DiscountRule, products: Product[]): string {
  const f = rule.filtro;
  const cat = f?.categorias?.[0] ?? (rule.scope === "category" ? rule.target : undefined);
  if (cat) return `/tienda?cat=${cat}`;
  const prodId = f?.productos?.[0] ?? (rule.scope === "product" ? rule.target : undefined);
  const p = products.find((x) => x.id === prodId);
  if (p) return `/producto/${p.slug}`;
  return "/tienda";
}

// ---- Armado final ----------------------------------------------------

export function buildPromos(
  liveRules: DiscountRule[],
  activeBanners: Banner[],
  products: Product[],
  categorias: Category[]
): PromoItem[] {
  const deReglas: PromoItem[] = [];

  for (const rule of liveRules) {
    const unidades = unidadesEnJuego(rule, products);
    // Una promocion sin stock es una promesa que no se puede cumplir.
    if (unidades <= 0) continue;

    deReglas.push({
      id: rule.id,
      title: gancho(rule),
      detail: detalle(rule),
      scope: alcance(rule, categorias, products),
      urgency: urgencia(unidades),
      href: destino(rule, products),
      cta: "Lo quiero",
    });
  }

  // Los banners son avisos libres que escribe la tienda (por ejemplo
  // "Delivery gratis desde 3 prendas"): van despues de los descuentos.
  const deBanners: PromoItem[] = activeBanners.map((banner) => ({
    id: banner.id,
    title: banner.title,
    detail: banner.text || banner.eyebrow,
    scope: banner.eyebrow || "",
    href: banner.href || "/tienda",
    image: banner.image,
    cta: banner.cta || "Ver más",
  }));

  return [...deReglas, ...deBanners];
}
