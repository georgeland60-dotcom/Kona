// =============================================================
//  LO MAS VENDIDO
//  Ordena el catalogo por unidades realmente vendidas (pedidos
//  pagados). Mientras no haya ventas registradas, cae de vuelta a
//  los productos marcados como destacados, de modo que la seccion
//  "Los favoritos" nunca se ve vacia.
// =============================================================

import { getTopProducts } from "@/lib/orders-data";
import { VENTAS_HISTORICAS } from "@/data/ventas-historicas";
import { homeCollections, type HomeCollection } from "@/data/collections";
import type { Product } from "@/lib/types";

export type BestSellers = {
  items: Product[];
  // true = el orden sale de ventas reales (las de esta tienda o las de
  // konamoda.pe); false = no hay ninguna y se muestran los destacados.
  basedOnSales: boolean;
};

// Unidades vendidas por producto (id -> unidades).
//
// Se suman las ventas de ESTA tienda y las que ese mismo producto hizo
// en konamoda.pe hasta que cerró. La tienda nueva arranca sin ventas, y
// sin esto "Los favoritos" enseñaba lo que alguien marcó a mano en vez
// de lo que la gente compra. Las de aquí pesan igual que las de allá y
// se acumulan encima, así que a medida que venda, el orden se vuelve
// suyo solo.
async function soldUnits(): Promise<Map<string, number>> {
  // Pedimos un tope alto para rankear todo el catalogo, no solo el top 5.
  const top = await getTopProducts(1000);

  const unidades = new Map<string, number>(Object.entries(VENTAS_HISTORICAS));
  for (const t of top) {
    unidades.set(t.productId, (unidades.get(t.productId) ?? 0) + t.unidades);
  }
  return unidades;
}

export async function getBestSellers(
  products: Product[],
  limit = 8
): Promise<BestSellers> {
  const sold = await soldUnits();

  const vendidos = products
    .filter((p) => (sold.get(p.id) ?? 0) > 0)
    .sort((a, b) => (sold.get(b.id) ?? 0) - (sold.get(a.id) ?? 0));

  // Relleno para completar la grilla: primero los destacados, luego el resto.
  const yaPuestos = new Set(vendidos.map((p) => p.id));
  const relleno = [
    ...products.filter((p) => p.featured && !yaPuestos.has(p.id)),
    ...products.filter((p) => !p.featured && !yaPuestos.has(p.id)),
  ];

  return {
    items: [...vendidos, ...relleno].slice(0, limit),
    basedOnSales: vendidos.length > 0,
  };
}

// ---- Colecciones ordenadas por venta --------------------------------

export type RankedCollection = {
  col: HomeCollection;
  unidades: number;
};

// Ordena las colecciones del inicio por cuanto vendieron sus productos.
// Si aun no hay ventas, respeta el orden definido en data/collections.ts.
export async function getTopCollections(
  products: Product[],
  limit = 4
): Promise<RankedCollection[]> {
  const sold = await soldUnits();

  const ranked = homeCollections.map((col) => {
    const items = products.filter((p) =>
      col.by === "category"
        ? p.category === col.value
        : (p.collections ?? []).includes(col.value)
    );
    const unidades = items.reduce((sum, p) => sum + (sold.get(p.id) ?? 0), 0);
    return { col, unidades, tiene: items.length > 0 };
  });

  return ranked
    .filter((r) => r.tiene) // no mostramos colecciones vacias
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, limit)
    .map(({ col, unidades }) => ({ col, unidades }));
}
