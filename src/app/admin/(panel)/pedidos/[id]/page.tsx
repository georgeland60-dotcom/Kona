import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderById } from "@/lib/orders-data";
import { formatPrice } from "@/lib/format";
import { changeOrderStatusAction } from "@/app/admin/pedidos-actions";
import { registrarPagoAction } from "@/app/admin/pagos-actions";
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

// Cómo se llama cada forma de pago en cristiano.
const METODO: Record<string, string> = {
  mercadopago: "Mercado Pago",
  transferencia: "Yape / Plin / transferencia",
  whatsapp: "WhatsApp",
};

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
        {METODO[order.method] ?? order.method}
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
            {/* El envío va como su propia línea: si no, el total no
                cuadra con la suma de los artículos y parece un error. */}
            {order.envio && (
              <tr className="border-t border-line">
                <td colSpan={2} className="px-4 py-3 text-right text-muted">
                  Envío a {order.envio.destino || "coordinar"}
                  {order.envio.direccion && (
                    <span className="block text-xs">
                      {order.envio.direccion}
                    </span>
                  )}
                  {/* El punto del mapa, listo para abrir en el móvil de
                      quien reparte: es lo único que no se puede leer de
                      dos maneras distintas. */}
                  {order.envio.lat !== undefined &&
                    order.envio.lon !== undefined && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${order.envio.lat},${order.envio.lon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs underline"
                      >
                        Ver el punto en el mapa
                      </a>
                    )}
                </td>
                <td className="px-4 py-3 text-right">
                  {order.envio.costo > 0
                    ? formatPrice(order.envio.costo)
                    : order.envio.promo
                      ? "gratis"
                      : "a coordinar"}
                  {/* Un envío en cero sin explicación parece un error de
                      cobro; con el nombre de la promoción, no lo es. */}
                  {order.envio.promo && (
                    <span className="block text-xs text-muted">
                      {order.envio.promo}
                    </span>
                  )}
                </td>
              </tr>
            )}
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

      {/* El pago hecho por fuera de la pasarela: de dónde salió y con
          qué comprobante. Un "pagado" sin esto no se puede auditar. */}
      {order.pago && (
        <div className="bg-background border border-line rounded-xl p-5 mb-6 text-sm">
          <h2 className="font-medium mb-2">Pago registrado</h2>
          <p className="capitalize">{order.pago.metodo}</p>
          <p className="text-muted text-xs">
            {fecha(order.pago.registradoEn)}
            {order.pago.registradoPor
              ? ` · desde ${order.pago.registradoPor}`
              : ""}
            {order.pago.monto !== undefined
              ? ` · ${formatPrice(order.pago.monto)}`
              : ""}
          </p>
          {order.pago.nota && <p className="mt-2">{order.pago.nota}</p>}
          {order.pago.comprobante && (
            <a
              href={order.pago.comprobante}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block w-40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={order.pago.comprobante}
                alt="Comprobante del pago"
                className="w-full rounded-lg border border-line"
              />
              <span className="text-xs underline text-muted">
                Ver el comprobante
              </span>
            </a>
          )}
        </div>
      )}

      {/* Registrar un pago por Yape, Plin o transferencia */}
      {order.status !== "pagado" && (
        <div className="bg-background border border-line rounded-xl p-5 mb-6">
          <h2 className="font-medium mb-1">Registrar pago</h2>
          <p className="text-xs text-muted mb-4">
            Para los que pagaron por Yape, Plin o transferencia y mandaron
            la captura por WhatsApp. Marca el pedido como pagado y deja
            constancia de con qué se pagó. (También puedes pedírselo al
            asistente por Telegram y adjuntar ahí la captura.)
          </p>
          <form
            action={registrarPagoAction}
            className="flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="id" value={order.id} />
            <label className="text-sm">
              <span className="block text-xs text-muted mb-1">Pagó con</span>
              <select
                name="metodo"
                defaultValue="yape"
                className="border border-line rounded-lg px-3 py-2 text-sm bg-background"
              >
                <option value="yape">Yape</option>
                <option value="plin">Plin</option>
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
                <option value="otro">Otro</option>
              </select>
            </label>
            <label className="text-sm flex-1 min-w-[12rem]">
              <span className="block text-xs text-muted mb-1">
                Nota (opcional)
              </span>
              <input
                name="nota"
                placeholder="Operación 00123456"
                className="w-full border border-line rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition">
              Dar por pagado
            </button>
          </form>
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
