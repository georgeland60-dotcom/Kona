"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartContext";
import { medir } from "@/lib/medicion";

export default function PagoExito() {
  const { clear, items, total, cargado } = useCart();
  const hecho = useRef(false);

  // Al llegar aqui el pago fue aprobado: confirmamos el pedido (descuenta
  // stock) y vaciamos el carrito. Se espera a que el carrito guardado se
  // haya leído (`cargado`): antes, el carrito "vacío" de los primeros
  // milisegundos ni se podía medir ni se quedaba vacío.
  useEffect(() => {
    if (!cargado || hecho.current) return;
    hecho.current = true;

    const params = window.location.search; // incluye external_reference, status, payment_id
    if (params) {
      fetch(`/api/orders/confirm${params}`).catch(() => {});
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
    <div className="max-w-md mx-auto px-4 py-28 text-center">
      <div className="text-5xl mb-6">✓</div>
      <h1 className="font-script text-5xl text-accent mb-4">¡Gracias!</h1>
      <p className="text-muted mb-8">
        Tu pago fue aprobado y tu pedido está en camino. Te contactaremos para
        coordinar la entrega.
      </p>
      <Link
        href="/"
        className="inline-block bg-foreground text-background px-8 py-3 rounded-full hover:bg-accent transition"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
