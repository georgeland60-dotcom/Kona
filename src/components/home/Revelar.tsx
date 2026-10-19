"use client";

import { useEffect, useRef, useState } from "react";

// =============================================================
//  REVELAR
//  Hace que una seccion aparezca cuando entra en pantalla, como si
//  la pagina fuera contando algo a medida que bajas.
//
//  Decisiones que evitan los dos problemas tipicos de este efecto:
//
//  1. SI EL JAVASCRIPT FALLA, NO SE PIERDE NADA. El contenido se
//     envia visible desde el servidor. Solo cuando el navegador
//     confirma que puede animar, se esconde lo que todavia esta
//     abajo y se va revelando. Si algo falla, la pagina se ve
//     entera, que es lo unico inaceptable de perder.
//
//  2. LO QUE YA SE VE AL ABRIR, NO PARPADEA. Si la seccion esta en
//     la primera pantalla, no se anima: se queda como esta. Animar
//     lo que la persona ya esta mirando se siente como un error.
//
//  Y si el telefono pide "menos movimiento", no se anima nada.
// =============================================================

export default function Revelar({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  /** Retraso en ms, para encadenar varios elementos. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [oculto, setOculto] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let animar = true;
    try {
      animar = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      animar = false;
    }
    if (!animar || typeof IntersectionObserver === "undefined") return;

    // Lo que ya esta en pantalla se queda quieto.
    const caja = el.getBoundingClientRect();
    if (caja.top < window.innerHeight * 0.9) return;

    setOculto(true);
    const obs = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect();
          }
        });
      },
      // Se dispara un poco antes de llegar, para que no se note el salto.
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const estado = !oculto || visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8";

  return (
    <div
      ref={ref}
      style={visible && delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`transition-all duration-700 ease-out ${estado} ${className}`}
    >
      {children}
    </div>
  );
}
