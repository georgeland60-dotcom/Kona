import Link from "next/link";
import { getProducts, getInventory } from "@/lib/store-data";
import {
  getSalesSummary,
  getSalesByDay,
  getTopProducts,
  getOrders,
} from "@/lib/orders-data";
import { getTotalProductViews } from "@/lib/metrics-data";
import { totalStock } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import AutoRefresh from "@/components/admin/AutoRefresh";

const LOW_STOCK = 3;

// El panel muestra siempre datos frescos (se re-renderiza en cada petición).
export const dynamic = "force-dynamic";

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
  });
}

// Rangos de fecha para los filtros del dashboard.
const RANGOS = [
  { key: "hoy", label: "Hoy" },
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "todo", label: "Todo" },
] as const;

function sinceFor(range: string | undefined): { since?: string; label: string } {
  const now = new Date();
  if (range === "hoy") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return { since: d.toISOString(), label: "hoy" };
  }
  if (range === "7d") {
    const d = new Date(now);
    d.setDate(now.getDate() - 7);
    return { since: d.toISOString(), label: "últimos 7 días" };
  }
  if (range === "30d") {
    const d = new Date(now);
    d.setDate(now.getDate() - 30);
    return { since: d.toISOString(), label: "últimos 30 días" };
  }
  return { label: "desde el inicio" };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const { since, label: rangeLabel } = sinceFor(range);

  const [products, inventory, sales, serie, top, recientes, vistas] =
    await Promise.all([
      getProducts({ includeInactive: true, raw: true }),
      getInventory(),
      getSalesSummary({ since }),
      getSalesByDay(14),
      getTopProducts(5),
      getOrders(),
      getTotalProductViews(),
    ]);

  const bajos = inventory.filter((r) => r.stock > 0 && r.stock <= LOW_STOCK);
  const ultimosPedidos = recientes.slice(0, 5);
  const maxSerie = Math.max(1, ...serie.map((d) => d.ingresos));

  const kpis = [
    {
      label: "Ingresos (pagados)",
      value: formatPrice(sales.ingresos),
      sub:
        range && range !== "todo"
          ? rangeLabel
          : `${formatPrice(sales.ingresosMes)} este mes`,
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
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-semibold">Hola 👋</h1>
        <AutoRefresh seconds={25} />
      </div>
      <p className="text-muted mb-6">Resumen de tu tienda Kona.</p>

      {/* Aviso de pedidos pendientes por cobrar */}
      {sales.pendientes > 0 && (
        <Link
          href="/admin/pedidos?estado=pendiente"
          className="flex items-center justify-between bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-5 py-3 mb-6 hover:bg-amber-100 transition"
        >
          <span className="text-sm font-medium">
            🔔 Tienes {sales.pendientes} pedido
            {sales.pendientes === 1 ? "" : "s"} pendiente
            {sales.pendientes === 1 ? "" : "s"} por cobrar
          </span>
          <span className="text-xs underline">Ver pedidos →</span>
        </Link>
      )}

      {/* Filtro por rango de fecha */}
      <div className="flex flex-wrap gap-2 mb-4">
        {RANGOS.map((r) => {
          const active = (range ?? "todo") === r.key;
          return (
            <Link
              key={r.key}
              href={r.key === "todo" ? "/admin" : `/admin?range=${r.key}`}
              className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                active
                  ? "bg-foreground text-background border-foreground"
                  : "border-line hover:border-foreground"
              }`}
            >
              {r.label}
            </Link>
          );
        })}
      </div>

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

      {/* Mini-gráfico: ingresos por día (últimos 14 días) */}
      <div className="bg-background border border-line rounded-xl p-5 mb-8">
        <h2 className="font-medium mb-4">Ventas por día (últimos 14 días)</h2>
        {maxSerie <= 1 && serie.every((d) => d.ingresos === 0) ? (
          <p className="text-sm text-muted py-4">
            Cuando tengas ventas pagadas, aquí verás la tendencia diaria.
          </p>
        ) : (
          <div className="flex items-end gap-1.5 h-32">
            {serie.map((d) => {
              const pct = Math.round((d.ingresos / maxSerie) * 100);
              const dia = d.day.slice(8, 10);
              return (
                <div
                  key={d.day}
                  className="flex-1 flex flex-col items-center justify-end h-full gap-1"
                  title={`${d.day}: ${formatPrice(d.ingresos)} · ${d.ventas} venta(s)`}
                >
                  <div
                    className="w-full rounded-t bg-accent/80 hover:bg-accent transition-all"
                    style={{ height: `${Math.max(d.ingresos > 0 ? 4 : 0, pct)}%` }}
                  />
                  <span className="text-[10px] text-muted">{dia}</span>
                </div>
              );
            })}
          </div>
        )}
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
        <a
          href="/api/admin/backup"
          className="border border-line text-muted px-5 py-2.5 rounded-lg text-sm font-medium hover:border-foreground hover:text-foreground transition"
          title="Descarga una copia de seguridad de pedidos, productos y stock"
        >
          ⬇︎ Copia de seguridad
        </a>
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
