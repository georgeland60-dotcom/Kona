"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { PromoItem } from "@/lib/promos-display";

// =============================================================
//  POP-UP DE PROMOCIONES
//  Muestra, al entrar a la web, todas las promociones vigentes.
//  Es dinamico: la lista viene del panel /admin, asi que prender o
//  apagar una promocion ahi cambia lo que se ve aqui.
//  Se cierra y no vuelve a molestar en la misma visita, pero si las
//  promociones cambian se muestra de nuevo.
// =============================================================

// Colores que se van alternando entre las promociones. Tailwind necesita
// leer el nombre completo de la clase, por eso estan escritos enteros.
const COLORES = [
  { bar: "bg-v3-primary", chip: "bg-v3-primary", texto: "text-v3-primary" },
  { bar: "bg-v3-teal", chip: "bg-v3-teal", texto: "text-v3-teal" },
  { bar: "bg-v3-coral", chip: "bg-v3-coral", texto: "text-v3-coral" },
  { bar: "bg-v3-lilac", chip: "bg-v3-lilac", texto: "text-v3-lilac" },
  { bar: "bg-v3-amber", chip: "bg-v3-amber", texto: "text-v3-amber" },
];

export default function PromoPopup({ promos }: { promos: PromoItem[] }) {
  const [open, setOpen] = useState(false);

  // Firma de las promociones actuales: si cambian, el pop-up vuelve a salir.
  const firma = promos.map((p) => p.id).join(",");
  const storageKey = `kona-promos-vistas:${firma}`;

  useEffect(() => {
    if (promos.length === 0) return;
    let yaVisto = false;
    try {
      yaVisto = window.sessionStorage.getItem(storageKey) === "1";
    } catch {
      // Navegacion privada o cookies bloqueadas: mostramos igual.
      yaVisto = false;
    }
    if (yaVisto) return;
    const t = window.setTimeout(() => setOpen(true), 900);
    return () => window.clearTimeout(t);
  }, [promos.length, storageKey]);

  const cerrar = useCallback(() => {
    setOpen(false);
    try {
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // Si no se puede guardar, solo se cierra por esta vez.
    }
  }, [storageKey]);

  // Cerrar con la tecla Escape y congelar el scroll del fondo.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };
    document.addEventListener("keydown", onKey);
    const scrollPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = scrollPrevio;
    };
  }, [open, cerrar]);

  if (promos.length === 0 || !open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="promo-popup-titulo"
    >
      {/* Fondo oscuro: al hacer clic tambien cierra */}
      <button
        type="button"
        aria-label="Cerrar promociones"
        onClick={cerrar}
        className="absolute inset-0 bg-v3-ink/60 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl animate-v3-pop-in">
        {/* Cabecera en el fucsia de la marca */}
        <div className="relative bg-accent px-6 py-7 text-center text-white">
          <p className="uppercase tracking-[0.3em] text-xs text-white/85">
            Aprovecha ahora
          </p>
          <h2
            id="promo-popup-titulo"
            className="font-script text-5xl leading-none mt-1"
          >
            Promociones
          </h2>
          <p className="text-base text-white/90 mt-2">
            {promos.length === 1
              ? "Hay 1 promoción activa"
              : `Hay ${promos.length} promociones activas`}
          </p>

          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar"
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/20 hover:bg-white/35 transition flex items-center justify-center text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Lista de promociones */}
        <ul className="divide-y divide-line">
          {promos.map((promo, idx) => {
            const color = COLORES[idx % COLORES.length];
            return (
              <li key={promo.id} className="flex items-stretch gap-3 px-5 py-4">
                <span
                  aria-hidden="true"
                  className={`w-1.5 rounded-full shrink-0 ${color.bar}`}
                />
                {promo.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={promo.image}
                    alt=""
                    className="w-14 h-18 object-cover rounded-lg shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  {/* el gancho, en grande */}
                  <p
                    className={`font-bold text-xl leading-tight ${color.texto}`}
                  >
                    {promo.title}
                  </p>
                  {promo.scope && (
                    <p className="font-semibold text-v3-ink text-base leading-snug">
                      {promo.scope}
                    </p>
                  )}
                  <p className="text-v3-ink-soft text-sm leading-snug mt-0.5">
                    {promo.detail}
                  </p>
                  {/* solo aparece cuando de verdad queda poco */}
                  {promo.urgency && (
                    <p className="inline-block mt-1.5 bg-v3-amber/20 text-v3-ink text-xs font-bold px-2 py-1 rounded-full">
                      ¡{promo.urgency}!
                    </p>
                  )}
                </div>
                <Link
                  href={promo.href}
                  onClick={cerrar}
                  className={`self-center shrink-0 text-white text-xs font-bold uppercase tracking-wide px-4 py-2.5 rounded-full hover:opacity-90 transition ${color.chip}`}
                >
                  {promo.cta}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="px-5 pb-5 pt-1">
          <button
            type="button"
            onClick={cerrar}
            className="w-full text-center text-v3-ink-soft text-base py-2 hover:text-accent transition"
          >
            Seguir viendo la tienda
          </button>
        </div>
      </div>
    </div>
  );
}
