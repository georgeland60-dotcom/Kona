import Link from "next/link";
import { getRules } from "@/lib/promos-data";
import { getProducts } from "@/lib/store-data";
import { categories } from "@/data/categories";
import { deleteRuleAction } from "@/app/admin/promos-actions";
import type { DiscountRule } from "@/lib/types";

function describeScope(
  rule: DiscountRule,
  catName: (slug: string) => string,
  prodName: (id: string) => string
): string {
  if (rule.scope === "all") return "Toda la tienda";
  if (rule.scope === "category")
    return `Categoría: ${catName(rule.target || "")}`;
  return `Producto: ${prodName(rule.target || "")}`;
}

function describeValue(rule: DiscountRule): string {
  return rule.kind === "percent" ? `${rule.value}% off` : `S/ ${rule.value} off`;
}

function describeWindow(rule: DiscountRule): string {
  const f = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString("es-PE") : null;
  const a = f(rule.startsAt);
  const b = f(rule.endsAt);
  if (a && b) return `${a} → ${b}`;
  if (a) return `desde ${a}`;
  if (b) return `hasta ${b}`;
  return "sin fecha límite";
}

export default async function DescuentosPage() {
  const [rules, products] = await Promise.all([
    getRules(),
    getProducts({ includeInactive: true, raw: true }),
  ]);
  const catName = (slug: string) =>
    categories.find((c) => c.slug === slug)?.name || slug || "—";
  const prodName = (id: string) =>
    products.find((p) => p.id === id)?.name || id || "—";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Descuentos</h1>
          <p className="text-muted text-sm">
            Reglas que bajan el precio solas en la tienda.
          </p>
        </div>
        <Link
          href="/admin/descuentos/nuevo"
          className="bg-accent text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-accent-dark transition"
        >
          + Nuevo descuento
        </Link>
      </div>

      {rules.length === 0 ? (
        <p className="text-sm text-muted bg-background border border-line rounded-xl p-6">
          Aún no hay descuentos. Crea una regla, por ejemplo “20% en toda la
          tienda”, y los precios se ajustan solos.
        </p>
      ) : (
        <div className="bg-background border border-line rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-soft text-muted text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">
                  Aplica a
                </th>
                <th className="px-4 py-3 font-medium">Descuento</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">
                  Vigencia
                </th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rules.map((r) => (
                <tr key={r.id} className="hover:bg-soft/50">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted">
                    {describeScope(r, catName, prodName)}
                  </td>
                  <td className="px-4 py-3 text-accent font-medium">
                    {describeValue(r)}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted text-xs">
                    {describeWindow(r)}
                  </td>
                  <td className="px-4 py-3">
                    {r.active ? (
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                        Activo
                      </span>
                    ) : (
                      <span className="text-xs bg-soft text-muted px-2 py-1 rounded-full">
                        Pausado
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/descuentos/${r.id}`}
                        className="text-accent hover:underline"
                      >
                        Editar
                      </Link>
                      <form action={deleteRuleAction}>
                        <input type="hidden" name="id" value={r.id} />
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
