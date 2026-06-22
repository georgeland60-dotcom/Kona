import Link from "next/link";
import { getProducts, getInventory } from "@/lib/store-data";
import {
  getSalesSummary,
  getTopProducts,
  getOrders,
} from "@/lib/orders-data";
import { getTotalProductViews } from "@/lib/metrics-data";
import { totalStock } from "@/lib/types";
import { formatPrice } from "@/lib/format";

const LOW_STOCK = 3;

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
  });
}

export default async function DashboardPage() {
  const [products, inventory, sales, top, recientes, vistas] = await Promise.all([
    getProducts({ includeInactive: true, raw: true }),
    getInventory(),
    getSalesSummary(),
    getTopProducts(5),
    getOrders(),
    getTotalProductViews(),
  ]);

  const bajos = inventory.filter((r) => r.stock > 0 && r.stock <= LOW_STOCK);
  const ultimosPedidos = recientes.slice(0, 5);

  const kpis = [
    {
      label: "Ingresos (pagados)",
      value: formatPrice(sales.ingresos),
      sub: `${formatPrice(sales.ingresosMes)} este mes`,
    },
    {
      label: "Ventas",
      value: String(sales.ventas),
      sub: `${sales.unidades} unidades vendidas`,
    },
    {
      label: "Pedidos pendientes",
      value: String(sales.pendientes),
      sub: "por confirmar / cobrar",
    },
    {
      label: "Vistas de productos",
      value: String(vistas),
      sub: "desde el inicio",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Hola 👋</h1>
      <p className="text-muted mb-8">Resumen de tu tienda Kona.</p>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((c) => (
          <div key={c.label} className="bg-background border border-line rounded-xl p-5">
            <p className="text-2xl font-semibold">{c.value}</p>
            <p className="text-sm font-medium mt-1">{c.label}</p>
            <p className="text-xs text-muted mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-10">
        <Link
          href="/admin/pedidos"
          className="bg-accent text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-accent-dark transition"
        >
          Ver pedidos
        </Link>
        <Link
          href="/admin/productos"
          className="border border-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-foreground hover:text-background transition"
        >
          Gestionar productos
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pedidos recientes */}
        <div className="bg-background border border-line rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">Pedidos recientes</h2>
            <Link href="/admin/pedidos" className="text-xs text-accent hover:underline">
              Ver todos
            </Link>
          </div>
          {ultimosPedidos.length === 0 ? (
            <p className="text-sm text-muted py-4">Aún no hay pedidos.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {ultimosPedidos.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2.5">
                  <Link href={`/admin/pedidos/${o.id}`} className="hover:text-accent">
                    {o.id}{" "}
                    <span className="text-muted text-xs">· {fecha(o.createdAt)}</span>
                  </Link>
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{formatPrice(o.total)}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                        o.status === "pagado"
                          ? "bg-green-50 text-green-700"
                          : o.status === "pendiente"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-soft text-muted"
                      }`}
                    >
                      {o.status}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top productos */}
        <div className="bg-background border border-line rounded-xl p-5">
          <h2 className="font-medium mb-3">Más vendidos</h2>
          {top.length === 0 ? (
            <p className="text-sm text-muted py-4">
              Cuando haya ventas pagadas, aquí verás tus productos estrella.
            </p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {top.map((t) => (
                <li key={t.productId} className="flex items-center justify-between py-2.5">
                  <span>{t.name}</span>
                  <span className="text-muted">
                    {t.unidades} uds · {formatPrice(t.ingresos)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Alerta de stock bajo */}
      {bajos.length > 0 && (
        <div className="bg-background border border-line rounded-xl p-5 mt-6">
          <h2 className="font-medium mb-3">⚠️ Tallas por reponer pronto</h2>
          <ul className="divide-y divide-line text-sm">
            {bajos.map((r) => (
              <li key={r.sku} className="flex items-center justify-between py-2">
                <span>
                  {r.productName} <span className="text-muted">· talla {r.size}</span>
                </span>
                <span className="font-medium text-accent">{r.stock} uds</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-muted mt-8">
        {products.length} productos · {products.filter((p) => totalStock(p) <= 0).length}{" "}
        agotados
      </p>
    </div>
  );
}
