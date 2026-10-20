"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/CartContext";
import { store } from "@/config/store";
import { formatPrice } from "@/lib/format";
import { costoDeEnvio, destinosAgrupados } from "@/lib/envios";
import { OTRAS_ZONAS } from "@/data/envios";
import type { Product } from "@/lib/types";

type OpcionDireccion = {
  direccion: string;
  destino: string | null;
  costo: number;
  conocido: boolean;
  // true = el distrito salió de lo que ella escribió, no del mapa.
  segunTexto?: boolean;
};

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

  // A dónde va el pedido. Se recuerda entre visitas: quien ya dijo su
  // distrito no tiene por qué repetirlo cada vez.
  const [destino, setDestino] = useState("");
  useEffect(() => {
    try {
      const guardado = localStorage.getItem("kona-destino");
      if (guardado) setDestino(guardado);
    } catch {
      // Modo incógnito: simplemente no se recuerda.
    }
  }, []);

  // Lo que escribió y lo que encontró el mapa.
  const [direccion, setDireccion] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [opciones, setOpciones] = useState<OpcionDireccion[]>([]);
  const [avisoMapa, setAvisoMapa] = useState<string | null>(null);
  const [manual, setManual] = useState(false);

  const buscarDireccion = async () => {
    const texto = direccion.trim();
    if (texto.length < 6 || buscando) return;
    setBuscando(true);
    setAvisoMapa(null);
    setOpciones([]);
    try {
      const res = await fetch(`/api/direccion?q=${encodeURIComponent(texto)}`);
      const datos = await res.json();
      const encontradas: OpcionDireccion[] = datos.opciones ?? [];
      setOpciones(encontradas);

      // Una sola coincidencia con distrito conocido: se elige sola, que
      // hacerla confirmar lo obvio es un paso de más.
      const utiles = encontradas.filter((o) => o.conocido);
      if (utiles.length === 1) elegirDestino(utiles[0].destino!);

      if (encontradas.length === 0) {
        setAvisoMapa(
          datos.aviso ??
            "No encontré esa dirección. Escríbela con el distrito (ej: Av. Larco 1234, Miraflores) o elige tu distrito de la lista."
        );
        setManual(true);
      } else if (utiles.length === 1 && utiles[0].segunTexto) {
        // Se tomó el distrito que ella escribió. Se dice, para que lo
        // corrija si se equivocó al escribirlo.
        setAvisoMapa(
          `No pude ubicar la dirección exacta en el mapa, así que tomé el distrito que escribiste (${utiles[0].destino}). Si no es ese, cámbialo abajo.`
        );
      }
    } catch {
      setAvisoMapa("No pude consultar el mapa. Elige tu distrito de la lista.");
      setManual(true);
    } finally {
      setBuscando(false);
    }
  };

  const elegirDestino = (valor: string) => {
    setDestino(valor);
    try {
      localStorage.setItem("kona-destino", valor);
    } catch {
      // Da igual: solo significa que la próxima vez lo vuelve a elegir.
    }
  };

  // El costo que se MUESTRA. El que se cobra lo vuelve a calcular el
  // servidor con esta misma tabla, así que no pueden discrepar.
  const envio = costoDeEnvio(destino);
  const totalConEnvio = total + envio.costo;

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
          destino,
          direccion,
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
  const checkout = async () => {
    if (items.length === 0) return;
    setPayError(null);

    // La pestaña se abre ANTES de esperar al servidor: si se abriera
    // después, el navegador lo tomaría por una ventana emergente y la
    // bloquearía. Si el pedido falla, se cierra.
    const pestana = window.open("", "_blank");

    // Registramos el pedido (pendiente): es lo que le reserva el stock y
    // lo que hace que la dueña lo vea en el panel.
    try {
      const res = await fetch("/api/orders", {
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
          destino,
          direccion,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const faltan = (data.faltantes ?? [])
          .map(
            (f: { producto: string; quedan: number }) =>
              `${f.producto}: quedan ${f.quedan}`
          )
          .join(", ");
        pestana?.close();
        setPayError(
          faltan
            ? `Se agotó algo mientras terminabas (${faltan}). Ajusta el carrito.`
            : (data.error ?? "No se pudo registrar el pedido.")
        );
        return;
      }
    } catch {
      // Sin conexión con nuestro servidor no vamos a dejar a la clienta
      // sin poder escribir: el pedido se coordina igual por WhatsApp.
    }

    const lineas = items.map((i) => {
      const talla = i.size ? ` (Talla ${i.size})` : "";
      return `• ${i.qty} x ${i.product.name}${talla} — ${formatPrice(
        i.product.price * i.qty
      )}`;
    });

    const mensaje =
      `¡Hola ${store.name}! Quiero hacer este pedido:\n\n` +
      lineas.join("\n") +
      (envio.conocido
        ? `\n\nEnvío a ${envio.destino}: ${formatPrice(envio.costo)}`
        : "") +
      `\n\nTotal: ${formatPrice(totalConEnvio)}` +
      (direccion.trim()
        ? `\n\nDirección de entrega: ${direccion.trim()}` +
          (envio.destino ? ` (${envio.destino})` : "") +
          "\n\nMi nombre es: "
        : envio.conocido
          ? `\n\nMi nombre es: \nDireccion de entrega (${envio.destino}): `
          : `\n\nMi nombre es: \nDistrito: \nDireccion de entrega: `);

    const url = `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(
      mensaje
    )}`;
    if (pestana) pestana.location.href = url;
    else window.open(url, "_blank");
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
                  {(() => {
                    // El tope real lo dice el servidor al preciar; mientras
                    // responde, se usa el stock que trae el producto.
                    const linea = precio?.lineas.find(
                      (x) => x.productId === i.product.id && x.size === i.size
                    );
                    const disponible =
                      linea?.disponible ??
                      (i.size
                        ? (i.product.variants.find((v) => v.size === i.size)
                            ?.stock ?? 0)
                        : i.product.variants.reduce((s, v) => s + v.stock, 0));
                    const enElTope = i.qty >= disponible;

                    return (
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <div className="flex items-center border border-line rounded">
                      <button
                        className="px-2 py-0.5"
                        onClick={() => setQty(i.product.id, i.qty - 1, i.size)}
                      >
                        −
                      </button>
                      <span className="px-2 text-sm">{i.qty}</span>
                      <button
                        className="px-2 py-0.5 disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={enElTope}
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
                    {enElTope && (
                      <span className="text-xs text-muted w-full">
                        {disponible === 1
                          ? "Queda 1 unidad"
                          : `Quedan ${disponible} unidades`}
                        {i.size ? ` en talla ${i.size}` : ""}
                      </span>
                    )}
                  </div>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="border-t border-line p-5 space-y-4">
            {/* Un descuento sobre el total va aparte, como una rebaja al
                final: es lo que hace visible el tope ("máximo S/ 85"). */}
            {precio?.descuentoCarrito && (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-muted">
                  <span>Subtotal</span>
                  <span>{formatPrice(precio.subtotal)}</span>
                </div>
                <div className="flex justify-between text-green-700 font-medium">
                  <span>
                    {precio.descuentoCarrito.nombre}
                    {precio.descuentoCarrito.topeAplicado &&
                      precio.descuentoCarrito.tope !== undefined && (
                        <span className="text-muted font-normal">
                          {" "}
                          (tope {formatPrice(precio.descuentoCarrito.tope)})
                        </span>
                      )}
                  </span>
                  <span>−{formatPrice(precio.descuentoCarrito.monto)}</span>
                </div>
              </div>
            )}
            {/* El envío, antes del total: enterarse del costo recién al
                pagar es la razón número uno de carritos abandonados. */}
            <div className="border-t border-line pt-3 space-y-2">
              <label className="block text-sm">
                ¿A dónde te lo enviamos?
                <span className="mt-1.5 flex gap-2">
                  <input
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        buscarDireccion();
                      }
                    }}
                    placeholder="Av. Larco 1234, Miraflores"
                    className="flex-1 border border-line rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={buscarDireccion}
                    disabled={buscando || direccion.trim().length < 6}
                    className="px-3 rounded-lg border border-accent text-accent text-sm disabled:opacity-40"
                  >
                    {buscando ? "…" : "Buscar"}
                  </button>
                </span>
              </label>

              {/* Lo que encontró el mapa. Si hay varias, elige ella:
                  adivinar entre dos direcciones parecidas sale caro. */}
              {opciones.length > 1 && (
                <div className="space-y-1">
                  {opciones.map((o) => (
                    <button
                      key={o.direccion}
                      type="button"
                      onClick={() => {
                        if (o.destino) elegirDestino(o.destino);
                        setDireccion(o.direccion);
                        setOpciones([]);
                      }}
                      className={`w-full text-left text-xs border rounded-lg px-3 py-2 transition ${
                        destino === o.destino
                          ? "border-accent"
                          : "border-line hover:border-foreground"
                      }`}
                    >
                      <span className="block">{o.direccion}</span>
                      <span className="text-muted">
                        {o.conocido
                          ? `${o.destino} · ${formatPrice(o.costo)}`
                          : "fuera de las zonas con precio cerrado"}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {avisoMapa && <p className="text-xs text-muted">{avisoMapa}</p>}

              {!manual && !destino && (
                <button
                  type="button"
                  onClick={() => setManual(true)}
                  className="text-xs text-muted underline"
                >
                  Prefiero elegir mi distrito de una lista
                </button>
              )}

              <label className={`block text-sm ${manual || destino ? "" : "hidden"}`}>
                <span className="text-muted text-xs">Distrito</span>
                <select
                  value={destino}
                  onChange={(e) => elegirDestino(e.target.value)}
                  className="mt-1.5 w-full border border-line rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:border-accent"
                >
                  <option value="">Elige tu distrito…</option>
                  {destinosAgrupados().map((g) => (
                    <optgroup key={g.grupo} label={g.grupo}>
                      {g.destinos.map((d) => (
                        <option key={d.nombre} value={d.nombre}>
                          {d.nombre} — {formatPrice(d.precio)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option value="otra">No está en la lista</option>
                </select>
              </label>

              {envio.conocido && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Envío a {envio.destino}</span>
                  <span>{formatPrice(envio.costo)}</span>
                </div>
              )}
              {!!destino && !envio.conocido && (
                <p className="text-xs text-muted">{OTRAS_ZONAS}</p>
              )}
            </div>

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
                {formatPrice(totalConEnvio)}
              </span>
            </div>
            {!destino && (
              <p className="text-xs text-muted -mt-2">
                Elige tu distrito arriba para ver el costo del envío.
              </p>
            )}
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
