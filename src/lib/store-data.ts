// =============================================================
//  CAPA DE DATOS DE LA TIENDA
//  Guarda los productos, tallas, SKU y stock en un archivo JSON
//  (data/store.json). No usa base de datos externa: así funciona
//  en cualquier PC sin instalar nada. El día que publiquemos la
//  tienda, solo se cambia este archivo por una base real.
//
//  La PRIMERA vez se crea solo, copiando los productos de
//  data/products.ts (la "semilla") y generando SKU + stock.
// =============================================================

import { promises as fs } from "fs";
import path from "path";
import { products as seedProducts } from "@/data/products";
import type { Product, SeedProduct, Variant } from "@/lib/types";
import { applyDiscounts, getLiveRules, withDiscount } from "@/lib/promos-data";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

type StoreData = {
  products: Product[];
  updatedAt: string;
};

// ---- Helpers de SKU --------------------------------------------------

// Convierte texto a mayúsculas sin acentos ni símbolos raros.
function slugUpper(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Genera un SKU legible: KONA-<SLUG>-<TALLA>
export function skuFor(slug: string, size: string): string {
  return `KONA-${slugUpper(slug)}-${slugUpper(size)}`;
}

// Convierte un producto "semilla" (con sizes) a Product (con variants).
function seedToProduct(seed: SeedProduct): Product {
  const sizes = seed.sizes && seed.sizes.length > 0 ? seed.sizes : ["Única"];
  const stock = seed.stock ?? 10;
  const variants: Variant[] = sizes.map((size) => ({
    size,
    sku: skuFor(seed.slug, size),
    stock,
  }));
  const { sizes: _omit, stock: _omit2, ...rest } = seed;
  return { ...rest, variants, active: rest.active ?? true };
}

// ---- Lectura / escritura del archivo --------------------------------

async function ensureSeed(): Promise<StoreData> {
  const data: StoreData = {
    products: seedProducts.map(seedToProduct),
    updatedAt: new Date().toISOString(),
  };
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(data, null, 2), "utf8");
  return data;
}

export async function readStore(): Promise<StoreData> {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    return JSON.parse(raw) as StoreData;
  } catch {
    // Si no existe (o está corrupto), lo creamos desde la semilla.
    return ensureSeed();
  }
}

async function writeStore(data: StoreData): Promise<void> {
  data.updatedAt = new Date().toISOString();
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(data, null, 2), "utf8");
}

// ---- Lectura de productos -------------------------------------------

// Por defecto solo devuelve los activos (visibles en la tienda) y con los
// descuentos vigentes ya aplicados al precio. El panel pasa { raw: true }
// para ver/editar los PRECIOS BASE (sin descuento).
export async function getProducts(opts?: {
  includeInactive?: boolean;
  raw?: boolean;
}): Promise<Product[]> {
  const { products } = await readStore();
  const list = opts?.includeInactive
    ? products
    : products.filter((p) => p.active !== false);
  if (opts?.raw) return list;
  return applyDiscounts(list);
}

export async function getProductBySlug(
  slug: string,
  opts?: { raw?: boolean }
): Promise<Product | undefined> {
  const { products } = await readStore();
  const product = products.find((p) => p.slug === slug);
  if (!product || opts?.raw) return product;
  return withDiscount(product, await getLiveRules());
}

export async function getProductById(
  id: string,
  opts?: { raw?: boolean }
): Promise<Product | undefined> {
  const { products } = await readStore();
  const product = products.find((p) => p.id === id);
  if (!product || opts?.raw) return product;
  return withDiscount(product, await getLiveRules());
}

// ---- Escritura de productos -----------------------------------------

// Crea o actualiza un producto (según si el id ya existe).
export async function upsertProduct(product: Product): Promise<Product> {
  const data = await readStore();
  const idx = data.products.findIndex((p) => p.id === product.id);
  if (idx >= 0) {
    data.products[idx] = product;
  } else {
    data.products.push(product);
  }
  await writeStore(data);
  return product;
}

export async function deleteProduct(id: string): Promise<void> {
  const data = await readStore();
  data.products = data.products.filter((p) => p.id !== id);
  await writeStore(data);
}

// Devuelve un id nuevo (el mayor numérico + 1).
export async function nextProductId(): Promise<string> {
  const { products } = await readStore();
  const max = products.reduce((m, p) => {
    const n = parseInt(p.id, 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return String(max + 1);
}

// ---- Inventario / stock ---------------------------------------------

// Ajusta el stock de una variante (delta puede ser negativo).
export async function adjustStock(
  productId: string,
  sku: string,
  delta: number
): Promise<void> {
  const data = await readStore();
  const product = data.products.find((p) => p.id === productId);
  const variant = product?.variants.find((v) => v.sku === sku);
  if (variant) {
    variant.stock = Math.max(0, variant.stock + delta);
    await writeStore(data);
  }
}

// Fija el stock de una variante a un valor exacto.
export async function setStock(
  productId: string,
  sku: string,
  value: number
): Promise<void> {
  const data = await readStore();
  const product = data.products.find((p) => p.id === productId);
  const variant = product?.variants.find((v) => v.sku === sku);
  if (variant) {
    variant.stock = Math.max(0, Math.floor(value));
    await writeStore(data);
  }
}

// Lista plana de todas las variantes (para la tabla de inventario).
export type InventoryRow = {
  productId: string;
  productName: string;
  slug: string;
  size: string;
  sku: string;
  stock: number;
  active: boolean;
};

export async function getInventory(): Promise<InventoryRow[]> {
  const { products } = await readStore();
  const rows: InventoryRow[] = [];
  for (const p of products) {
    for (const v of p.variants) {
      rows.push({
        productId: p.id,
        productName: p.name,
        slug: p.slug,
        size: v.size,
        sku: v.sku,
        stock: v.stock,
        active: p.active !== false,
      });
    }
  }
  return rows;
}
