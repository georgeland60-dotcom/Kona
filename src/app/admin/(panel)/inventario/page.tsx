import Link from "next/link";
import { getInventory } from "@/lib/store-data";
import {
  setStockAction,
  adjustStockAction,
  importarInventarioRealAction,
} from "@/app/admin/inventario-actions";
import { CORTE_INVENTARIO, INVENTARIO_REAL } from "@/data/inventario-real";

const LOW_STOCK = 3;

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ low?: string; importado?: string; unidades?: string }>;
}) {
  const { low, importado, unidades } = await searchParams;
  const onlyLow = low === "1";

  let rows = await getInventory();
  if (onlyLow) rows = rows.filter((r) => r.stock <= LOW_STOCK);

  const totalUnidades = rows.reduce((s, r) => s + r.stock, 0);

  return (
    <div>
      {importado && (
        <p className="mb-5 text-sm bg-green-50 text-green-700 border border-green-200 rounded-lg px-4 py-2.5">
          Inventario actualizado: {importado} productos, {unidades} unidades.
        </p>
      )}

      {/* Traer el stock de la tienda anterior. Mientras no se use, la
          tienda sigue con las 10 unidades inventadas de cada talla, que
          es vender lo que no hay. */}
      <div className="mb-6 bg-background border border-line rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">
            Inventario de konamoda.pe ({CORTE_INVENTARIO})
          </p>
          <p className="text-xs text-muted mt-1 max-w-xl">
            Pone en los {Object.keys(INVENTARIO_REAL).length} productos las
            unidades que había de verdad en la tienda anterior, talla por
            talla, y quita las tallas que nunca existieron. Pisa los ajustes
            de stock que hayas hecho a mano.
          </p>
        </div>
        <form action={importarInventarioRealAction}>
          <button className="bg-accent text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-accent-dark transition whitespace-nowrap">
            Traer ese inventario
          </button>
        </form>
      </div>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Inventario / Stock</h1>
          <p className="text-muted text-sm">
            {rows.length} tallas (SKU) · {totalUnidades} unidades
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link
            href="/admin/inventario"
            className={`px-4 py-2 rounded-lg border transition ${
              !onlyLow
                ? "bg-foreground text-background border-foreground"
                : "border-line hover:border-foreground"
            }`}
          >
            Todo
          </Link>
          <Link
            href="/admin/inventario?low=1"
            className={`px-4 py-2 rounded-lg border transition ${
              onlyLow
                ? "bg-foreground text-background border-foreground"
                : "border-line hover:border-foreground"
            }`}
          >
            Poco stock (≤{LOW_STOCK})
          </Link>
        </div>
      </div>

      <div className="bg-background border border-line rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-soft text-muted text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium">Talla</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">SKU</th>
              <th className="px-4 py-3 font-medium">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => {
              const lowClass =
                r.stock <= 0
                  ? "text-red-600"
                  : r.stock <= LOW_STOCK
                    ? "text-accent"
                    : "";
              return (
                <tr key={r.sku} className="hover:bg-soft/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/productos/${r.productId}`}
                      className="font-medium hover:text-accent"
                    >
                      {r.productName}
                    </Link>
                    {!r.active && (
                      <span className="ml-2 text-xs text-muted">(oculto)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{r.size}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <code className="text-xs text-muted">{r.sku}</code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {/* −1 */}
                      <form action={adjustStockAction}>
                        <input type="hidden" name="productId" value={r.productId} />
                        <input type="hidden" name="sku" value={r.sku} />
                        <input type="hidden" name="delta" value="-1" />
                        <button
                          type="submit"
                          aria-label="Restar 1"
                          className="w-7 h-7 rounded-full border border-line hover:border-foreground"
                        >
                          −
                        </button>
                      </form>

                      {/* valor exacto */}
                      <form
                        action={setStockAction}
                        className="flex items-center gap-1"
                      >
                        <input type="hidden" name="productId" value={r.productId} />
                        <input type="hidden" name="sku" value={r.sku} />
                        <input
                          name="stock"
                          type="number"
                          min={0}
                          defaultValue={r.stock}
                          className={`w-16 border border-line rounded-lg px-2 py-1 text-center focus:outline-none focus:border-accent ${lowClass}`}
                        />
                        <button
                          type="submit"
                          className="text-xs text-accent hover:underline px-1"
                        >
                          Guardar
                        </button>
                      </form>

                      {/* +1 */}
                      <form action={adjustStockAction}>
                        <input type="hidden" name="productId" value={r.productId} />
                        <input type="hidden" name="sku" value={r.sku} />
                        <input type="hidden" name="delta" value="1" />
                        <button
                          type="submit"
                          aria-label="Sumar 1"
                          className="w-7 h-7 rounded-full border border-line hover:border-foreground"
                        >
                          +
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  No hay tallas que mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
