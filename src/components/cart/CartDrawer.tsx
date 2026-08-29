"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/CartContext";
import { store } from "@/config/store";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

// Devuelve el SKU de la talla elegida (o el de la única variante).
function skuOf(product: Product, size?: string): string | undefined {
  const vs = product.variants ?? [];
  if (size) return vs.find((v) => v.size === size)?.sku;
  return vs.length === 1 ? vs[0].sku : undefined;
}

export default function CartDrawer() {
  const { items, isOpen, setOpen, setQty, remove, total, precio, calculando, clear, count } =
    useCart();
  const [loading, setLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Pago online con Mercado Pago (tarjeta / Yape)
  const payOnline = async () => {
    if (items.length === 0) return;
    setLoading(true);
    setPayError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.product.id,
            sku: skuOf(i.product, i.size),
            name: i.product.name,
            price: i.product.price,
            qty: i.qty,
            size: i.size,
          })),
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // lleva a la pagina de pago
      } else {
        setPayError(data.error || "No se pudo iniciar el pago.");
      }
    } catch {
      setPayError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // Arma el mensaje del pedido y lo abre en WhatsApp
  const checkout = () => {
    if (items.length === 0) return;

    // Registramos el pedido (pendiente) para que la dueña lo vea en el panel.
    fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "whatsapp",
        items: items.map((i) => ({
          productId: i.product.id,
          sku: skuOf(i.product, i.size),
          name: i.product.name,
          price: i.product.price,
          qty: i.qty,
          size: i.size,
        })),
      }),
    }).catch(() => {});

    const lineas = items.map((i) => {
      const talla = i.size ? ` (Talla ${i.size})` : "";
      return `• ${i.qty} x ${i.product.name}${talla} — ${formatPrice(
        i.product.price * i.qty
      )}`;
    });

    const mensaje =
      `¡Hola ${store.name}! Quiero hacer este pedido:\n\n` +
      lineas.join("\n") +
      `\n\nTotal: ${formatPrice(total)}` +
      `\n\nMi nombre es: \nDireccion de entrega: `;

    const url = `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(
      mensaje
    )}`;
    window.open(url, "_blank");
  };

  return (
    <>
      {/* Fondo oscuro */}
      <div
        className={`fixed inset-0 bg-black/40 z-50 transition-opacity ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Panel lateral */}
      <aside
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-background z-50 shadow-xl flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-line">
          <h2 className="text-lg font-medium">Tu carrito ({count})</h2>
          <button onClick={() => setOpen(false)} aria-label="Cerrar" className="text-2xl leading-none">
            ×
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted text-sm">
            Tu carrito esta vacio
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {items.map((i) => (
              <div key={i.product.id + (i.size ?? "")} className="flex gap-4">
                <div className="w-20 h-24 placeholder-box rounded overflow-hidden flex-shrink-0">
                  {i.product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={i.product.image}
                      alt={i.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{i.product.name}</p>
                  {i.size && (
                    <p className="text-xs text-muted">Talla {i.size}</p>
                  )}
                  {(() => {
                    // Buscamos qué dijo el servidor para esta línea. Si aún
                    // no respondió, mostramos el precio de lista.
                    const l = precio?.lineas.find(
                      (x) => x.productId === i.product.id && x.size === i.size
                    );
                    const conPromo = !!l && l.precioUnitario < l.precioLista;
                    return (
                      <div className="mt-1">
                        <p className="text-sm">
                          {conPromo && (
                            <span className="text-muted line-through mr-2">
                              {formatPrice(
                                l!.regaladas > 0 ? l!.subtotalLista : l!.precioLista
                              )}
                            </span>
                          )}
                          <span className={conPromo ? "text-accent font-semibold" : "text-accent"}>
                            {/* Con un 2x1 las unidades valen distinto, así que
                                mostramos lo que se paga por la línea entera. */}
                            {l && l.regaladas > 0
                              ? formatPrice(l.subtotal)
                              : formatPrice(l ? l.precioUnitario : i.product.price)}
                          </span>
                        </p>
                        {conPromo && l?.promo && (
                          <p className="text-xs text-green-700 font-medium mt-0.5">
                            {l.regaladas > 0
                              ? `🎁 ${l.promo} · ${l.regaladas} ${
                                  l.regaladas === 1 ? "unidad" : "unidades"
                                } de regalo`
                              : l.promo}{" "}
                            · ahorras {formatPrice(l.ahorro)}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center border border-line rounded">
                      <button
                        className="px-2 py-0.5"
                        onClick={() => setQty(i.product.id, i.qty - 1, i.size)}
                      >
                        −
                      </button>
                      <span className="px-2 text-sm">{i.qty}</span>
                      <button
                        className="px-2 py-0.5"
                        onClick={() => setQty(i.product.id, i.qty + 1, i.size)}
                      >
                        +
                      </button>
                    </div>
                    <button
                      className="text-xs text-muted underline"
                      onClick={() => remove(i.product.id, i.size)}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="border-t border-line p-5 space-y-4">
            <div className="flex justify-between text-base items-baseline">
              <span>
                Total
                {calculando && (
                  <span className="text-xs text-muted ml-2">actualizando…</span>
                )}
              </span>
              <span className="font-medium">
                {precio && precio.ahorro > 0 && (
                  <span className="text-muted line-through font-normal text-sm mr-2">
                    {formatPrice(precio.totalLista)}
                  </span>
                )}
                {formatPrice(total)}
              </span>
            </div>
            {precio && precio.ahorro > 0 && (
              <p className="text-sm text-green-700 font-medium -mt-2">
                Ahorras {formatPrice(precio.ahorro)}
              </p>
            )}
            <button
              onClick={payOnline}
              disabled={loading}
              className="w-full bg-accent text-white py-3 rounded-full font-medium hover:bg-accent-dark transition disabled:opacity-60"
            >
              {loading ? "Redirigiendo..." : "Pagar ahora (tarjeta o Yape)"}
            </button>

            {payError && (
              <p className="text-xs text-red-600 text-center">{payError}</p>
            )}

            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="flex-1 h-px bg-line" />o<span className="flex-1 h-px bg-line" />
            </div>

            <button
              onClick={checkout}
              className="w-full bg-[#25D366] text-white py-3 rounded-full font-medium flex items-center justify-center gap-2 hover:opacity-90 transition"
            >
              Coordinar por WhatsApp
            </button>
            <button
              onClick={clear}
              className="w-full text-xs text-muted underline"
            >
              Vaciar carrito
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
