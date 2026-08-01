// =============================================================
//  MÉTRICAS DE VISITAS / VISTAS
//  Cuenta cuántas veces se ve cada producto y cuántas visitas
//  recibe la tienda. Ahora se guarda en SQLite (ver src/lib/db.ts):
//   - visitas totales -> tabla meta (clave "visits")
//   - vistas por producto -> tabla product_views
// =============================================================

import { getDb, getMeta, setMeta } from "@/lib/db";

export type Metrics = {
  visits: number; // visitas a la tienda (home)
  productViews: Record<string, number>; // vistas por id de producto
  updatedAt: string;
};

function touch(): void {
  setMeta(getDb(), "metrics_updatedAt", new Date().toISOString());
}

export async function recordProductView(productId: string): Promise<void> {
  if (!productId) return;
  const db = getDb();
  db.prepare(
    `INSERT INTO product_views (product_id, views) VALUES (?, 1)
     ON CONFLICT(product_id) DO UPDATE SET views = views + 1`
  ).run(productId);
  touch();
}

export async function recordVisit(): Promise<void> {
  const db = getDb();
  const current = Number(getMeta(db, "visits") ?? "0");
  setMeta(db, "visits", String(current + 1));
  touch();
}

export async function getMetrics(): Promise<Metrics> {
  const db = getDb();
  const visits = Number(getMeta(db, "visits") ?? "0");
  const rows = db
    .prepare("SELECT product_id, views FROM product_views")
    .all() as { product_id: string; views: number }[];
  const productViews: Record<string, number> = {};
  for (const r of rows) productViews[r.product_id] = r.views;
  const updatedAt = getMeta(db, "metrics_updatedAt") ?? new Date().toISOString();
  return { visits, productViews, updatedAt };
}

// Total de vistas de producto (suma de todas).
export async function getTotalProductViews(): Promise<number> {
  const row = getDb()
    .prepare("SELECT COALESCE(SUM(views), 0) AS total FROM product_views")
    .get() as { total: number };
  return row.total;
}
