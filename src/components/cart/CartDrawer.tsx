"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useCart } from "@/components/cart/CartContext";
import { store } from "@/config/store";
import { formatPrice } from "@/lib/format";
import {
  LIMA_Y_CALLAO,
  destinoDelFormulario,
  distritosDeLima,
  envioGratisAplica,
  provincias,
} from "@/lib/envios";
import { OTRAS_ZONAS } from "@/data/envios";
import type { Punto } from "@/components/cart/MapaEntrega";
import type { Product } from "@/lib/types";

// El mapa trae Leaflet consigo (~150 KB). Se carga solo cuando hay una
// dirección que enseñar, no al abrir la tienda. Y sin pintarlo en el
// servidor: Leaflet necesita un navegador de verdad.
const MapaEntrega = dynamic(() => import("@/components/cart/MapaEntrega"), {
  ssr: false,
  loading: () => <div className="h-44 rounded-xl bg-line/40 animate-pulse" />,
});

// Dónde cayó la dirección en el mapa, para enseñárselo y que confirme.
type Mapa = {
  direccion: string;
  lat: number;
  lon: number;
  zona: string | null;
  precision?: "exacta" | "calle" | "zona";
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

  // A dónde va el pedido: los tres datos, obligatorios. Antes bastaba
  // con escribir algo y buscarlo; con eso llegaban pedidos a "Mz E Lt
  // 24" sin distrito, y había que perseguir a la clienta por WhatsApp
  // para poder despachar.
  const [direccion, setDireccion] = useState("");
  const [distrito, setDistrito] = useState("");
  const [provincia, setProvincia] = useState("");

  const [mapa, setMapa] = useState<Mapa | null>(null);
  // Dónde dejó ELLA el pin, si lo movió. Manda sobre lo que encontró el
  // buscador: nadie conoce su puerta mejor que ella.
  const [pin, setPin] = useState<Punto | null>(null);
  const [avisoMapa, setAvisoMapa] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);

  // Se recuerda entre visitas: quien ya dio su dirección no tiene por
  // qué repetirla cada vez.
  useEffect(() => {
    try {
      const guardado = localStorage.getItem("kona-entrega");
      if (guardado) {
        const e = JSON.parse(guardado);
        setDireccion(e.direccion ?? "");
        setDistrito(e.distrito ?? "");
        setProvincia(e.provincia ?? "");
      }
    } catch {
      // Modo incógnito: simplemente no se recuerda.
    }
  }, []);

  const recordar = (cambio: Partial<{ direccion: string; distrito: string; provincia: string }>) => {
    const entrega = { direccion, distrito, provincia, ...cambio };
    try {
      localStorage.setItem("kona-entrega", JSON.stringify(entrega));
    } catch {
      // Da igual: solo significa que la próxima vez lo vuelve a escribir.
    }
  };

  // El costo que se MUESTRA. El que se cobra lo vuelve a calcular el
  // servidor con esta misma tabla, así que no pueden discrepar.
  const envio = destinoDelFormulario({ provincia, distrito });

  // ¿Alguna promoción regala el envío? Quien lo decide es el servidor
  // (viene en el precio del carrito); aquí solo se comprueba que el
  // destino elegido esté entre los que cubre.
  const promoEnvio =
    precio?.envioGratis &&
    envioGratisAplica(
      precio.envioGratis.destinos,
      provincia === LIMA_Y_CALLAO ? distrito : provincia
    )
      ? precio.envioGratis
      : null;

  const costoEnvio = promoEnvio ? 0 : envio.costo;
  const totalConEnvio = total + costoEnvio;

  // Sin los tres datos no se puede despachar, así que no se deja pagar.
  const faltanDatos =
    direccion.trim().length < 5 || !distrito.trim() || !provincia.trim();

  const verEnElMapa = async () => {
    if (faltanDatos || buscando) return;
    setBuscando(true);
    setAvisoMapa(null);
    try {
      const url =
        `/api/direccion?direccion=${encodeURIComponent(direccion)}` +
        `&distrito=${encodeURIComponent(distrito)}` +
        `&provincia=${encodeURIComponent(provincia)}`;
      const res = await fetch(url);
      const datos = await res.json();
      setMapa(datos.mapa ?? null);
      setAvisoMapa(datos.aviso ?? null);
    } catch {
      setMapa(null);
      setAvisoMapa("No pude consultar el mapa, pero puedes seguir con tu compra.");
    } finally {
      setBuscando(false);
    }
  };

  // El mapa se pide solo cuando los tres datos están completos, con una
  // pausa para no consultar en cada tecla.
  useEffect(() => {
    if (faltanDatos) {
      setMapa(null);
      setPin(null);
      return;
    }
    const t = setTimeout(verEnElMapa, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direccion, distrito, provincia]);

  // El punto que se manda con el pedido: el que ella marcó, o el que
  // encontró el buscador.
  const punto = pin ?? (mapa ? { lat: mapa.lat, lon: mapa.lon } : null);

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
          destino: provincia === LIMA_Y_CALLAO ? distrito : provincia,
          direccion: `${direccion}, ${distrito}, ${provincia}`,
          ...(punto ? { lat: punto.lat, lon: punto.lon } : {}),
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
          destino: provincia === LIMA_Y_CALLAO ? distrito : provincia,
          direccion: `${direccion}, ${distrito}, ${provincia}`,
          ...(punto ? { lat: punto.lat, lon: punto.lon } : {}),
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
        ? `\n\nEnvío a ${envio.destino}: ` +
          (promoEnvio ? `gratis (${promoEnvio.nombre})` : formatPrice(envio.costo))
        : "") +
      `\n\nTotal: ${formatPrice(totalConEnvio)}` +
      `\n\nDirección de entrega: ${direccion.trim()}` +
      `\nDistrito: ${distrito} · ${provincia}` +
      (punto
        ? `\nUbicación${pin ? " (marcada por mí)" : ""}: ` +
          `https://www.google.com/maps/search/?api=1&query=${punto.lat},${punto.lon}`
        : "") +
      "\n\nMi nombre es: ";

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
                pagar es la razón número uno de carritos abandonados.
                Y los tres datos son obligatorios porque sin ellos no
                hay manera de despachar el pedido. */}
            <div className="border-t border-line pt-3 space-y-2">
              <p className="text-sm font-medium">¿A dónde te lo enviamos?</p>

              <label className="block">
                <span className="text-xs text-muted">Provincia</span>
                <select
                  value={provincia}
                  onChange={(e) => {
                    setProvincia(e.target.value);
                    // Cambiar de provincia invalida el distrito elegido.
                    setDistrito("");
                    recordar({ provincia: e.target.value, distrito: "" });
                  }}
                  className="mt-1 w-full border border-line rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:border-accent"
                >
                  <option value="">Elige tu provincia…</option>
                  {provincias().map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs text-muted">Distrito</span>
                {provincia === LIMA_Y_CALLAO ? (
                  <select
                    value={distrito}
                    onChange={(e) => {
                      setDistrito(e.target.value);
                      recordar({ distrito: e.target.value });
                    }}
                    className="mt-1 w-full border border-line rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:border-accent"
                  >
                    <option value="">Elige tu distrito…</option>
                    {distritosDeLima().map((d) => (
                      <option key={d.nombre} value={d.nombre}>
                        {d.nombre} — {formatPrice(d.precio)}
                      </option>
                    ))}
                    <option value="otro">No está en la lista</option>
                  </select>
                ) : (
                  <input
                    value={distrito}
                    onChange={(e) => {
                      setDistrito(e.target.value);
                      recordar({ distrito: e.target.value });
                    }}
                    placeholder={provincia ? "Tu distrito" : "Elige antes la provincia"}
                    disabled={!provincia}
                    className="mt-1 w-full border border-line rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:border-accent disabled:opacity-50"
                  />
                )}
              </label>

              <label className="block">
                <span className="text-xs text-muted">
                  Dirección (calle, número, referencia)
                </span>
                <input
                  value={direccion}
                  onChange={(e) => {
                    setDireccion(e.target.value);
                    recordar({ direccion: e.target.value });
                  }}
                  placeholder="Av. José Larco 1234, dpto. 502"
                  className="mt-1 w-full border border-line rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:border-accent"
                />
              </label>

              {/* El mapa: que vea el punto y lo confirme. Una dirección
                  escrita se lee de mil formas; un punto, no. */}
              {buscando && (
                <p className="text-xs text-muted">Buscando en el mapa…</p>
              )}

              {mapa && (
                <MapaEntrega
                  lat={mapa.lat}
                  lon={mapa.lon}
                  direccion={mapa.direccion}
                  precision={mapa.precision}
                  onMover={setPin}
                />
              )}

              {avisoMapa && <p className="text-xs text-muted">{avisoMapa}</p>}

              {envio.conocido && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Envío a {envio.destino}</span>
                  {promoEnvio ? (
                    <span className="text-green-700 font-medium">
                      <span className="text-muted line-through font-normal mr-2">
                        {formatPrice(envio.costo)}
                      </span>
                      Gratis
                    </span>
                  ) : (
                    <span>{formatPrice(envio.costo)}</span>
                  )}
                </div>
              )}
              {promoEnvio && envio.conocido && (
                <p className="text-xs text-green-700">🚚 {promoEnvio.nombre}</p>
              )}
              {!!distrito && !!provincia && !envio.conocido && (
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
            {faltanDatos && (
              <p className="text-xs text-muted -mt-2">
                Completa provincia, distrito y dirección para ver el envío y
                poder pagar.
              </p>
            )}
            {precio && precio.ahorro > 0 && (
              <p className="text-sm text-green-700 font-medium -mt-2">
                Ahorras {formatPrice(precio.ahorro)}
              </p>
            )}
            <button
              onClick={payOnline}
              disabled={loading || faltanDatos}
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
              disabled={faltanDatos}
              className="w-full bg-[#25D366] text-white py-3 rounded-full font-medium flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-40"
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
