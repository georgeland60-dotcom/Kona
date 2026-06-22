import Link from "next/link";
import { getOrders } from "@/lib/orders-data";
import { formatPrice } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

const STATUS_STYLE: Record<OrderStatus, string> = {
  pendiente: "bg-amber-50 text-amber-700",
  pagado: "bg-green-50 text-green-700",
  cancelado: "bg-soft text-muted",
};

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const FILTERS: { key: string; label: string }[] = [
  { key: "", label: "Todos" },
  { key: "pendiente", label: "Pendientes" },
  { key: "pagado", label: "Pagados" },
  { key: "cancelado", label: "Cancelados" },
];

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const valid: OrderStatus[] = ["pendiente", "pagado", "cancelado"];
  const status = valid.includes(estado as OrderStatus)
    ? (estado as OrderStatus)
    : undefined;

  const orders = await getOrders(status ? { status } : undefined);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Pedidos</h1>
          <p className="text-muted text-sm">{orders.length} en esta vista</p>
        </div>
        <div className="flex gap-2 text-sm flex-wrap">
          {FILTERS.map((f) => {
            const active = (estado || "") === f.key;
            return (
              <Link
                key={f.key}
                href={f.key ? `/admin/pedidos?estado=${f.key}` : "/admin/pedidos"}
                className={`px-3 py-2 rounded-lg border transition ${
                  active
                    ? "bg-foreground text-background border-foreground"
                    : "border-line hover:border-foreground"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="bg-background border border-line rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-soft text-muted text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Pedido</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Fecha</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Medio</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-soft/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/pedidos/${o.id}`}
                    className="font-medium hover:text-accent"
                  >
                    {o.id}
                  </Link>
                  <p className="text-xs text-muted">
                    {o.items.reduce((s, i) => s + i.qty, 0)} artículo(s)
                  </p>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell text-muted">
                  {fecha(o.createdAt)}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {o.method === "mercadopago" ? "Mercado Pago" : "WhatsApp"}
                </td>
                <td className="px-4 py-3 font-medium">{formatPrice(o.total)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full capitalize ${STATUS_STYLE[o.status]}`}
                  >
                    {o.status}
                  </span>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  Aún no hay pedidos en esta vista.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
