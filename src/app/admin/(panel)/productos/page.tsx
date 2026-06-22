import Link from "next/link";
import { getProducts } from "@/lib/store-data";
import { totalStock } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { deleteProductAction } from "@/app/admin/productos-actions";

export default async function ProductosPage() {
  const products = await getProducts({ includeInactive: true, raw: true });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Productos</h1>
          <p className="text-muted text-sm">{products.length} en total</p>
        </div>
        <Link
          href="/admin/productos/nuevo"
          className="bg-accent text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-accent-dark transition"
        >
          + Nuevo producto
        </Link>
      </div>

      <div className="bg-background border border-line rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-soft text-muted text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Precio</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Stock</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p) => {
              const stock = totalStock(p);
              return (
                <tr key={p.id} className="hover:bg-soft/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-12 placeholder-box rounded overflow-hidden flex-shrink-0">
                        {p.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {formatPrice(p.price)}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={stock <= 0 ? "text-red-600" : ""}>
                      {stock} uds
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.active === false ? (
                      <span className="text-xs bg-soft text-muted px-2 py-1 rounded-full">
                        Oculto
                      </span>
                    ) : (
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                        Activo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/productos/${p.id}`}
                        className="text-accent hover:underline"
                      >
                        Editar
                      </Link>
                      <form action={deleteProductAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          type="submit"
                          className="text-muted hover:text-red-600"
                        >
                          Borrar
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
