"use client";

import { useState } from "react";
import { store } from "@/config/store";

export default function LibroReclamaciones() {
  const [sent, setSent] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => (f.get(k) as string) || "";

    const msg =
      `*LIBRO DE RECLAMACIONES — ${store.name}*\n\n` +
      `Tipo: ${get("tipo")}\n` +
      `Nombre: ${get("nombre")}\n` +
      `Documento: ${get("documento")}\n` +
      `Teléfono: ${get("telefono")}\n` +
      `Correo: ${get("correo")}\n` +
      `Producto / servicio: ${get("producto")}\n\n` +
      `Detalle:\n${get("detalle")}\n\n` +
      `Pedido del consumidor:\n${get("pedido")}`;

    window.open(
      `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(msg)}`,
      "_blank"
    );
    setSent(true);
  };

  const input =
    "w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent";

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 md:py-24">
      <h1 className="font-script text-5xl text-accent mb-3 text-center">
        Libro de Reclamaciones
      </h1>
      <p className="text-muted text-center text-sm mb-10 leading-relaxed">
        Conforme al Código de Protección y Defensa del Consumidor (Ley N° 29571).
        Déjanos tu reclamo o queja y te responderemos a la brevedad.
      </p>

      {sent ? (
        <div className="text-center bg-soft border border-line rounded-xl p-8">
          <div className="text-4xl mb-4">✓</div>
          <p className="text-muted">
            Tu reclamo fue registrado y enviado. Nos pondremos en contacto
            contigo pronto. Gracias por escribirnos.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <select name="tipo" required className={input} defaultValue="">
              <option value="" disabled>
                Tipo *
              </option>
              <option value="Reclamo">Reclamo</option>
              <option value="Queja">Queja</option>
            </select>
            <input name="documento" placeholder="DNI / documento" className={input} />
          </div>
          <input name="nombre" placeholder="Nombre completo *" required className={input} />
          <div className="grid md:grid-cols-2 gap-4">
            <input name="telefono" placeholder="Teléfono *" required className={input} />
            <input name="correo" type="email" placeholder="Correo electrónico" className={input} />
          </div>
          <input name="producto" placeholder="Producto o servicio" className={input} />
          <textarea
            name="detalle"
            placeholder="Detalle del reclamo o queja *"
            required
            rows={4}
            className={input}
          />
          <textarea
            name="pedido"
            placeholder="¿Qué solicitas? (pedido del consumidor)"
            rows={3}
            className={input}
          />
          <button
            type="submit"
            className="w-full bg-accent text-white py-3 rounded-full font-medium hover:bg-accent-dark transition"
          >
            Enviar reclamo
          </button>
        </form>
      )}
    </div>
  );
}
