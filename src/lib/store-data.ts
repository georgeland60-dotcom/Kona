// =============================================================
//  CAPA DE DATOS DE LA TIENDA (productos, tallas, SKU y stock)
//  Ahora usa SQLite (ver src/lib/db.ts) en vez de un archivo JSON.
//  Las funciones exportadas mantienen la MISMA forma que antes, así
//  el resto de la tienda (páginas y panel) no necesita cambios.
// =============================================================

import type { Product, Variant } from "@/lib/types";
import { applyDiscounts, getLiveRules, withDiscount } from "@/lib/promos-data";
import { getDb, getMeta, setMeta, skuFor } from "@/lib/db";

// Re-exportamos skuFor para no romper a quien lo importaba desde aquí.
export { skuFor };

type StoreData = {
  products: Product[];
  updatedAt: string;
};

// ---- Filas de la base -> objetos Product ----------------------------

type ProductRow = {
  id: string;
  ord: number;
  slug: string;
  name: string;
  price: number;
  category: string;
  image: string | null;
  images: string | null;
  description: string | null;
  featured: number;
  collections: string | null;
  onSale: number;
  oldPrice: number | null;
  active: number;
};

type VariantRow = {
  sku: string;
  product_id: string;
  ord: number;
  size: string;
  stock: number;
};

function rowToProduct(row: ProductRow, variants: Variant[]): Product {
  const product: Product = {
    id: row.id,
    slug: row.slug,
    name: row.name,
    price: row.price,
    category: row.category,
    variants,
    active: row.active === 1,
  };
  if (row.image) product.image = row.image;
  if (row.images) product.images = JSON.parse(row.images) as string[];
  if (row.description) product.description = row.description;
  if (row.featured === 1) product.featured = true;
  if (row.collections)
    product.collections = JSON.parse(row.collections) as string[];
  if (row.onSale === 1) product.onSale = true;
  if (row.oldPrice != null) product.oldPrice = row.oldPrice;
  return product;
}

// Carga todos los productos (con sus variantes) ordenados como la semilla.
function loadAllProducts(): Product[] {
  const db = getDb();
  const prows = db
    .prepare("SELECT * FROM products ORDER BY ord, id")
    .all() as ProductRow[];
  const vrows = db
    .prepare("SELECT * FROM variants ORDER BY product_id, ord")
    .all() as VariantRow[];

  const byProduct = new Map<string, Variant[]>();
  for (const v of vrows) {
    const list = byProduct.get(v.product_id) ?? [];
    list.push({ size: v.size, sku: v.sku, stock: v.stock });
    byProduct.set(v.product_id, list);
  }
  return prows.map((r) => rowToProduct(r, byProduct.get(r.id) ?? []));
}

function loadProductBy(field: "slug" | "id", value: string): Product | undefined {
  const db = getDb();
  const prow = db
    .prepare(`SELECT * FROM products WHERE ${field} = ?`)
    .get(value) as ProductRow | undefined;
  if (!prow) return undefined;
  const vrows = db
    .prepare("SELECT * FROM variants WHERE product_id = ? ORDER BY ord")
    .all(prow.id) as VariantRow[];
  const variants = vrows.map((v) => ({ size: v.size, sku: v.sku, stock: v.stock }));
  return rowToProduct(prow, variants);
}

// ---- Compatibilidad: readStore --------------------------------------

export async function readStore(): Promise<StoreData> {
  const products = loadAllProducts();
  const updatedAt = getMeta(getDb(), "store_updatedAt") ?? new Date().toISOString();
  return { products, updatedAt };
}

function touchStore(): void {
  setMeta(getDb(), "store_updatedAt", new Date().toISOString());
}

// ---- Lectura de productos -------------------------------------------

// Por defecto solo devuelve los activos (visibles en la tienda) y con los
// descuentos vigentes ya aplicados al precio. El panel pasa { raw: true }
// para ver/editar los PRECIOS BASE (sin descuento).
export async function getProducts(opts?: {
  includeInactive?: boolean;
  raw?: boolean;
}): Promise<Product[]> {
  const all = loadAllProducts();
  const list = opts?.includeInactive
    ? all
    : all.filter((p) => p.active !== false);
  if (opts?.raw) return list;
  return applyDiscounts(list);
}

export async function getProductBySlug(
  slug: string,
  opts?: { raw?: boolean }
): Promise<Product | undefined> {
  const product = loadProductBy("slug", slug);
  if (!product || opts?.raw) return product;
  return withDiscount(product, await getLiveRules());
}

export async function getProductById(
  id: string,
  opts?: { raw?: boolean }
): Promise<Product | undefined> {
  const product = loadProductBy("id", id);
  if (!product || opts?.raw) return product;
  return withDiscount(product, await getLiveRules());
}

// ---- Escritura de productos -----------------------------------------

// Crea o actualiza un producto (según si el id ya existe).
export async function upsertProduct(product: Product): Promise<Product> {
  const db = getDb();

  const existing = db
    .prepare("SELECT ord FROM products WHERE id = ?")
    .get(product.id) as { ord: number } | undefined;

  const ord =
    existing?.ord ??
    ((
      db.prepare("SELECT COALESCE(MAX(ord), -1) + 1 AS next FROM products").get() as {
        next: number;
      }
    ).next);

  const upsert = db.transaction(() => {
    db.prepare(
      `INSERT INTO products
        (id, ord, slug, name, price, category, image, images, description,
         featured, collections, onSale, oldPrice, active)
       VALUES
        (@id, @ord, @slug, @name, @price, @category, @image, @images, @description,
         @featured, @collections, @onSale, @oldPrice, @active)
       ON CONFLICT(id) DO UPDATE SET
         slug=excluded.slug, name=excluded.name, price=excluded.price,
         category=excluded.category, image=excluded.image, images=excluded.images,
         description=excluded.description, featured=excluded.featured,
         collections=excluded.collections, onSale=excluded.onSale,
         oldPrice=excluded.oldPrice, active=excluded.active`
    ).run({
      id: product.id,
      ord,
      slug: product.slug,
      name: product.name,
      price: product.price,
      category: product.category,
      image: product.image ?? null,
      images: product.images ? JSON.stringify(product.images) : null,
      description: product.description ?? null,
      featured: product.featured ? 1 : 0,
      collections: product.collections ? JSON.stringify(product.collections) : null,
      onSale: product.onSale ? 1 : 0,
      oldPrice: product.oldPrice ?? null,
      active: product.active === false ? 0 : 1,
    });

    // Reemplazamos las variantes por las nuevas (conservando el stock que
    // venga en el objeto). Borramos e insertamos dentro de la transacción.
    db.prepare("DELETE FROM variants WHERE product_id = ?").run(product.id);
    const insVariant = db.prepare(
      `INSERT INTO variants (sku, product_id, ord, size, stock)
       VALUES (@sku, @product_id, @ord, @size, @stock)`
    );
    product.variants.forEach((v, i) => {
      insVariant.run({
        sku: v.sku,
        product_id: product.id,
        ord: i,
        size: v.size,
        stock: Math.max(0, Math.floor(v.stock)),
      });
    });
    touchStore();
  });
  upsert();

  return product;
}

export async function deleteProduct(id: string): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM products WHERE id = ?").run(id); // variantes: ON DELETE CASCADE
  touchStore();
}

// Devuelve un id nuevo (el mayor numérico + 1).
export async function nextProductId(): Promise<string> {
  const db = getDb();
  const rows = db.prepare("SELECT id FROM products").all() as { id: string }[];
  const max = rows.reduce((m, r) => {
    const n = parseInt(r.id, 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return String(max + 1);
}

// ---- Inventario / stock ---------------------------------------------

// Ajusta el stock de una variante (delta puede ser negativo). Atómico:
// una sola instrucción SQL, no puede "chocar" con otra compra.
export async function adjustStock(
  productId: string,
  sku: string,
  delta: number
): Promise<void> {
  const db = getDb();
  db.prepare(
    "UPDATE variants SET stock = MAX(0, stock + ?) WHERE sku = ? AND product_id = ?"
  ).run(delta, sku, productId);
  touchStore();
}

// Fija el stock de una variante a un valor exacto.
export async function setStock(
  productId: string,
  sku: string,
  value: number
): Promise<void> {
  const db = getDb();
  db.prepare(
    "UPDATE variants SET stock = MAX(0, ?) WHERE sku = ? AND product_id = ?"
  ).run(Math.floor(value), sku, productId);
  touchStore();
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
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.id AS productId, p.name AS productName, p.slug AS slug,
              v.size AS size, v.sku AS sku, v.stock AS stock, p.active AS active
       FROM variants v
       JOIN products p ON p.id = v.product_id
       ORDER BY p.ord, p.id, v.ord`
    )
    .all() as (Omit<InventoryRow, "active"> & { active: number })[];
  return rows.map((r) => ({ ...r, active: r.active === 1 }));
}
