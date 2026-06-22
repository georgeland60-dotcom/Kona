import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderById } from "@/lib/orders-data";
import { formatPrice } from "@/lib/format";
import { changeOrderStatusAction } from "@/app/admin/pedidos-actions";
import type { OrderStatus } from "@/lib/types";

const STATUS_STYLE: Record<OrderStatus, string> = {
  pendiente: "bg-amber-50 text-amber-700",
  pagado: "bg-green-50 text-green-700",
  cancelado: "bg-soft text-muted",
};

function fecha(iso: string) {
  return new Date(iso).toLocaleString("es-PE", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export default async function PedidoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  return (
    <div className="max-w-2xl">
      <Link href="/admin/pedidos" className="text-sm text-muted hover:text-accent">
        ← Pedidos
      </Link>

      <div className="flex items-center gap-3 mt-2 mb-1">
        <h1 className="text-2xl font-semibold">{order.id}</h1>
        <span
          className={`text-xs px-2 py-1 rounded-full capitalize ${STATUS_STYLE[order.status]}`}
        >
          {order.status}
        </span>
      </div>
      <p className="text-muted text-sm mb-6">
        {fecha(order.createdAt)} ·{" "}
        {order.method === "mercadopago" ? "Mercado Pago" : "WhatsApp"}
      </p>

      {/* Artículos */}
      <div className="bg-background border border-line rounded-xl overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-soft text-muted text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium text-center">Cant.</th>
              <th className="px-4 py-3 font-medium text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {order.items.map((i, idx) => (
              <tr key={idx}>
                <td className="px-4 py-3">
                  {i.name}
                  {i.size && <span className="text-muted"> · Talla {i.size}</span>}
                  {i.sku && (
                    <div className="text-xs text-muted">
                      <code>{i.sku}</code>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-center">{i.qty}</td>
                <td className="px-4 py-3 text-right">
                  {formatPrice(i.price * i.qty)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line">
              <td colSpan={2} className="px-4 py-3 font-medium text-right">
                Total
              </td>
              <td className="px-4 py-3 font-semibold text-right">
                {formatPrice(order.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {order.customer &&
        (order.customer.name || order.customer.phone || order.customer.email) && (
          <div className="bg-background border border-line rounded-xl p-5 mb-6 text-sm">
            <h2 className="font-medium mb-2">Cliente</h2>
            {order.customer.name && <p>{order.customer.name}</p>}
            {order.customer.phone && (
              <p className="text-muted">{order.customer.phone}</p>
            )}
            {order.customer.email && (
              <p className="text-muted">{order.customer.email}</p>
            )}
          </div>
        )}

      {/* Acciones de estado */}
      <div className="bg-background border border-line rounded-xl p-5">
        <h2 className="font-medium mb-1">Cambiar estado</h2>
        <p className="text-xs text-muted mb-4">
          Marcar como <b>pagado</b> descuenta el stock de las tallas vendidas
          (solo la primera vez).
        </p>
        <div className="flex flex-wrap gap-3">
          {order.status !== "pagado" && (
            <form action={changeOrderStatusAction}>
              <input type="hidden" name="id" value={order.id} />
              <input type="hidden" name="status" value="pagado" />
              <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition">
                Marcar como pagado
              </button>
            </form>
          )}
          {order.status !== "pendiente" && (
            <form action={changeOrderStatusAction}>
              <input type="hidden" name="id" value={order.id} />
              <input type="hidden" name="status" value="pendiente" />
              <button className="border border-line px-4 py-2 rounded-lg text-sm hover:bg-soft transition">
                Volver a pendiente
              </button>
            </form>
          )}
          {order.status !== "cancelado" && (
            <form action={changeOrderStatusAction}>
              <input type="hidden" name="id" value={order.id} />
              <input type="hidden" name="status" value="cancelado" />
              <button className="text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm hover:bg-red-50 transition">
                Cancelar pedido
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
