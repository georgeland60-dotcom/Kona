"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartContext";
import { medir } from "@/lib/medicion";
import { formatPrice } from "@/lib/format";
import type { ResumenPedido } from "@/lib/resumen-pedido";
import { mapaDeRecojo } from "@/lib/envios";

export default function PagoExito() {
  const { clear, items, total, cargado } = useCart();
  const hecho = useRef(false);
  // El resumen del pedido, tal como quedó guardado. Llega solo si el
  // pago de Mercado Pago es de este pedido.
  const [resumen, setResumen] = useState<ResumenPedido | null>(null);
  const [buscando, setBuscando] = useState(true);

  // Al llegar aqui el pago fue aprobado: confirmamos el pedido (descuenta
  // stock) y vaciamos el carrito. Se espera a que el carrito guardado se
  // haya leído (`cargado`): antes, el carrito "vacío" de los primeros
  // milisegundos ni se podía medir ni se quedaba vacío.
  useEffect(() => {
    if (!cargado || hecho.current) return;
    hecho.current = true;

    const params = window.location.search; // incluye external_reference, status, payment_id
    if (params) {
      fetch(`/api/orders/confirm${params}`)
        .then((r) => r.json())
        .then((d) => setResumen(d.resumen ?? null))
        .catch(() => {})
        .finally(() => setBuscando(false));
    } else {
      // Sin datos del pago no hay pedido que buscar.
      Promise.resolve().then(() => setBuscando(false));
    }

    // La venta, para GA4 y el Pixel. Se mide ANTES de vaciar el carrito
    // (después ya no se sabe qué compró), y una sola vez por pedido:
    // recargar esta página no puede contar la misma venta dos veces.
    const datos = new URLSearchParams(params);
    const pedido = datos.get("external_reference") || datos.get("payment_id");
    const aprobado = (datos.get("status") ?? "approved") === "approved";
    if (pedido && aprobado && items.length > 0) {
      const marca = `kona-medida-${pedido}`;
      let yaContada = false;
      try {
        yaContada = sessionStorage.getItem(marca) === "1";
        sessionStorage.setItem(marca, "1");
      } catch {
        // Sin sessionStorage (modo privado estricto): se mide igual.
      }
      if (!yaContada) {
        medir({
          tipo: "compra",
          pedido,
          total,
          lineas: items.map((i) => ({
            id: i.product.id,
            nombre: i.product.name,
            precio: i.product.price,
            cantidad: i.qty,
            talla: i.size,
          })),
        });
      }
    }

    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargado]);

  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <div className="text-center">
        <div className="text-5xl mb-4">✓</div>
        <h1 className="font-script text-5xl text-accent mb-3">¡Gracias!</h1>
        <p className="text-muted">
          Tu pago fue aprobado
          {resumen?.envio?.recojo
            ? ". Te escribimos por WhatsApp cuando tu pedido esté listo para recoger."
            : " y tu pedido está en camino. Te contactaremos para coordinar la entrega."}
        </p>
      </div>

      {buscando && (
        <p className="text-center text-sm text-muted mt-8">Cargando tu pedido…</p>
      )}

      {resumen && (
        <section className="mt-8 border border-line rounded-2xl overflow-hidden text-left">
          <div className="flex items-baseline justify-between gap-3 px-5 py-4 bg-soft">
            <div>
              <p className="text-xs text-muted">Tu pedido</p>
              <p className="text-lg font-medium">{resumen.id}</p>
            </div>
            <p className="text-xs text-muted text-right">
              {new Date(resumen.fecha).toLocaleString("es-PE", {
                dateStyle: "long",
                timeStyle: "short",
                timeZone: "America/Lima",
              })}
            </p>
          </div>

          <ul className="divide-y divide-line">
            {resumen.lineas.map((l, i) => (
              <li key={i} className="flex gap-4 px-5 py-4">
                {l.imagen ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={l.imagen}
                    alt={l.nombre}
                    className="w-20 h-24 object-cover rounded-lg bg-soft shrink-0"
                  />
                ) : (
                  <div className="w-20 h-24 rounded-lg bg-soft shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  {l.enlace ? (
                    <Link href={l.enlace} className="font-medium hover:text-accent">
                      {l.nombre}
                    </Link>
                  ) : (
                    <p className="font-medium">{l.nombre}</p>
                  )}
                  <p className="text-sm text-muted mt-1">
                    {l.talla && <>Talla {l.talla} · </>}
                    Cantidad {l.cantidad}
                  </p>
                  <p className="text-sm text-muted">
                    {l.precioAntes && (
                      <span className="line-through mr-2">
                        {formatPrice(l.precioAntes)}
                      </span>
                    )}
                    <span className={l.precioAntes ? "text-accent font-medium" : ""}>
                      {formatPrice(l.precio)}
                    </span>{" "}
                    c/u
                  </p>
                </div>
                <p className="font-medium shrink-0">{formatPrice(l.subtotal)}</p>
              </li>
            ))}
          </ul>

          <div className="px-5 py-4 border-t border-line space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Productos</span>
              <span>
                {formatPrice(resumen.lineas.reduce((s, l) => s + l.subtotal, 0))}
              </span>
            </div>
            {resumen.envio && (
              <div className="flex justify-between gap-4">
                <span className="text-muted">
                  {resumen.envio.recojo
                    ? "Recojo en tienda"
                    : `Envío a ${resumen.envio.destino || "coordinar"}`}
                  {resumen.envio.direccion && (
                    <span className="block text-xs">{resumen.envio.direccion}</span>
                  )}
                  {/* En el carrito solo se dice "al frente del Jockey
                      Plaza": la dirección exacta se da aquí, al terminar. */}
                  {resumen.envio.recojo && (
                    <a
                      href={mapaDeRecojo()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs underline"
                    >
                      Ver en Google Maps
                    </a>
                  )}
                  {resumen.envio.promo && (
                    <span className="block text-xs text-green-700">
                      {resumen.envio.promo}
                    </span>
                  )}
                </span>
                <span className="shrink-0">
                  {resumen.envio.costo > 0 ? formatPrice(resumen.envio.costo) : "Gratis"}
                </span>
              </div>
            )}
            {resumen.ahorro > 0 && (
              <div className="flex justify-between text-green-700 font-medium">
                <span>Ahorraste</span>
                <span>{formatPrice(resumen.ahorro)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-medium pt-2 border-t border-line">
              <span>Total pagado</span>
              <span>{formatPrice(resumen.total)}</span>
            </div>
          </div>
        </section>
      )}

      {resumen && (
        <p className="text-xs text-muted text-center mt-4">
          Guarda tu número de pedido ({resumen.id}) por si necesitas escribirnos.
        </p>
      )}

      <div className="text-center mt-8">
        <Link
          href="/"
          className="inline-block bg-foreground text-background px-8 py-3 rounded-full hover:bg-accent transition"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
