// =============================================================
//  MÉTRICAS DE VISITAS / VISTAS
//  Cuenta cuántas veces se ve cada producto y cuántas visitas
//  recibe la tienda. Se guarda en el documento "metrics".
// =============================================================

import { readDoc, writeDoc } from "@/lib/kv";

export type Metrics = {
  visits: number; // visitas a la tienda (home)
  productViews: Record<string, number>; // vistas por id de producto
  updatedAt: string;
};

async function readMetrics(): Promise<Metrics> {
  return readDoc<Metrics>("metrics", () => ({
    visits: 0,
    productViews: {},
    updatedAt: new Date().toISOString(),
  }));
}

async function writeMetrics(m: Metrics): Promise<void> {
  m.updatedAt = new Date().toISOString();
  await writeDoc("metrics", m);
}

export async function recordProductView(productId: string): Promise<void> {
  if (!productId) return;
  const m = await readMetrics();
  m.productViews[productId] = (m.productViews[productId] || 0) + 1;
  await writeMetrics(m);
}

export async function recordVisit(): Promise<void> {
  const m = await readMetrics();
  m.visits += 1;
  await writeMetrics(m);
}

export async function getMetrics(): Promise<Metrics> {
  return readMetrics();
}

// Total de vistas de producto (suma de todas).
export async function getTotalProductViews(): Promise<number> {
  const m = await readMetrics();
  return Object.values(m.productViews).reduce((s, n) => s + n, 0);
}
