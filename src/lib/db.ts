// =============================================================
//  BASE DE DATOS (SQLite)
//  Reemplaza los antiguos archivos JSON (data/*.json) por una base
//  de datos real embebida, guardada en UN solo archivo:
//    - En local:      data/kona.db
//    - En producción: la ruta que indique KONA_DB_PATH (disco persistente)
//
//  ¿Por qué SQLite y no archivos JSON?
//   · Transacciones: crear un pedido y descontar stock ocurre de forma
//     ATÓMICA (o todo, o nada) -> dos compras a la vez NO se pisan.
//   · No necesita servidor aparte ni cuesta dinero extra: es un archivo.
//   · Migrar mañana a Postgres/otra base es sencillo (mismas funciones).
//
//  La PRIMERA vez la base se crea sola y se llena con la "semilla"
//  (los productos de data/products.ts y los banners de data/banners.ts).
// =============================================================

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { products as seedProducts } from "@/data/products";
import { banners as seedBanners } from "@/data/banners";

// Ruta del archivo de la base. En Render apuntará al disco persistente.
const DB_PATH =
  process.env.KONA_DB_PATH || path.join(process.cwd(), "data", "kona.db");

// Guardamos la conexión en una variable global para no abrir muchas
// conexiones durante el "hot reload" de desarrollo.
const globalForDb = globalThis as unknown as {
  __konaDb?: Database.Database;
};

export function getDb(): Database.Database {
  if (globalForDb.__konaDb) return globalForDb.__konaDb;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  // WAL: mejor rendimiento y lecturas concurrentes sin bloquear escrituras.
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  migrate(db);
  seedIfEmpty(db);

  globalForDb.__konaDb = db;
  return db;
}

// ---- Esquema (se crea si no existe) ---------------------------------

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id          TEXT PRIMARY KEY,
      ord         INTEGER,
      slug        TEXT,
      name        TEXT,
      price       REAL,
      category    TEXT,
      image       TEXT,
      images      TEXT,          -- JSON array de rutas
      description TEXT,
      featured    INTEGER,
      collections TEXT,          -- JSON array de slugs
      onSale      INTEGER,
      oldPrice    REAL,
      active      INTEGER
    );

    CREATE TABLE IF NOT EXISTS variants (
      sku        TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      ord        INTEGER,
      size       TEXT,
      stock      INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_variants_product ON variants(product_id);

    CREATE TABLE IF NOT EXISTS orders (
      id             TEXT PRIMARY KEY,
      seq            INTEGER,
      createdAt      TEXT,
      total          REAL,
      method         TEXT,
      status         TEXT,
      customer_name  TEXT,
      customer_phone TEXT,
      customer_email TEXT,
      stockApplied   INTEGER NOT NULL DEFAULT 0,
      mpPaymentId    TEXT
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id  TEXT NOT NULL,
      productId TEXT,
      sku       TEXT,
      name      TEXT,
      size      TEXT,
      price     REAL,
      qty       INTEGER,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

    CREATE TABLE IF NOT EXISTS banners (
      id      TEXT PRIMARY KEY,
      ord     INTEGER,
      eyebrow TEXT,
      title   TEXT,
      text    TEXT,
      cta     TEXT,
      href    TEXT,
      image   TEXT,
      active  INTEGER
    );

    CREATE TABLE IF NOT EXISTS discount_rules (
      id       TEXT PRIMARY KEY,
      ord      INTEGER,
      name     TEXT,
      scope    TEXT,
      target   TEXT,
      kind     TEXT,
      value    REAL,
      active   INTEGER,
      startsAt TEXT,
      endsAt   TEXT
    );

    CREATE TABLE IF NOT EXISTS product_views (
      product_id TEXT PRIMARY KEY,
      views      INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

// ---- Helpers de meta (contadores y flags) ---------------------------

export function getMeta(db: Database.Database, key: string): string | null {
  const row = db.prepare("SELECT value FROM meta WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row ? row.value : null;
}

export function setMeta(
  db: Database.Database,
  key: string,
  value: string
): void {
  db.prepare(
    "INSERT INTO meta (key, value) VALUES (?, ?) " +
      "ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}

// ---- Semilla inicial -------------------------------------------------

// Convierte texto a mayúsculas sin acentos ni símbolos (para el SKU).
function slugUpper(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function skuFor(slug: string, size: string): string {
  return `KONA-${slugUpper(slug)}-${slugUpper(size)}`;
}

function seedIfEmpty(db: Database.Database): void {
  // Solo sembramos UNA vez cada tabla (marcamos con un flag en meta) para
  // no re-crear datos si el admin borra todo a propósito.
  if (getMeta(db, "seeded_products") !== "1") {
    const insProduct = db.prepare(
      `INSERT INTO products
        (id, ord, slug, name, price, category, image, images, description,
         featured, collections, onSale, oldPrice, active)
       VALUES
        (@id, @ord, @slug, @name, @price, @category, @image, @images, @description,
         @featured, @collections, @onSale, @oldPrice, @active)`
    );
    const insVariant = db.prepare(
      `INSERT INTO variants (sku, product_id, ord, size, stock)
       VALUES (@sku, @product_id, @ord, @size, @stock)`
    );

    const seed = db.transaction(() => {
      seedProducts.forEach((p, i) => {
        insProduct.run({
          id: p.id,
          ord: i,
          slug: p.slug,
          name: p.name,
          price: p.price,
          category: p.category,
          image: p.image ?? null,
          images: p.images ? JSON.stringify(p.images) : null,
          description: p.description ?? null,
          featured: p.featured ? 1 : 0,
          collections: p.collections ? JSON.stringify(p.collections) : null,
          onSale: p.onSale ? 1 : 0,
          oldPrice: p.oldPrice ?? null,
          active: p.active === false ? 0 : 1,
        });
        const sizes = p.sizes && p.sizes.length > 0 ? p.sizes : ["Única"];
        const stock = p.stock ?? 10;
        sizes.forEach((size, vi) => {
          insVariant.run({
            sku: skuFor(p.slug, size),
            product_id: p.id,
            ord: vi,
            size,
            stock,
          });
        });
      });
      setMeta(db, "seeded_products", "1");
    });
    seed();
  }

  if (getMeta(db, "seeded_banners") !== "1") {
    const insBanner = db.prepare(
      `INSERT INTO banners (id, ord, eyebrow, title, text, cta, href, image, active)
       VALUES (@id, @ord, @eyebrow, @title, @text, @cta, @href, @image, @active)`
    );
    const seed = db.transaction(() => {
      seedBanners.forEach((b, i) => {
        insBanner.run({
          id: `BAN-${i + 1}`,
          ord: i,
          eyebrow: b.eyebrow,
          title: b.title,
          text: b.text,
          cta: b.cta,
          href: b.href,
          image: b.image,
          active: 1,
        });
      });
      setMeta(db, "seeded_banners", "1");
    });
    seed();
  }
}
