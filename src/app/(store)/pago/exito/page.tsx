"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartContext";

export default function PagoExito() {
  const { clear } = useCart();

  // Al llegar aqui el pago fue aprobado: confirmamos el pedido (descuenta
  // stock) y vaciamos el carrito.
  useEffect(() => {
    const params = window.location.search; // incluye external_reference, status, payment_id
    if (params) {
      fetch(`/api/orders/confirm${params}`).catch(() => {});
    }
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
