"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// =============================================================
//  BANNER ROTATIVO DE LA PORTADA
//  Va pasando las fotos solo, cada unos segundos, y deja cambiarlas
//  a mano con los puntitos de abajo.
//
//  Cuidados que no se ven pero importan:
//   · Si la persona pidio "menos movimiento" en su telefono, no rota
//     sola: se queda quieta y ella pasa las fotos si quiere.
//   · Se detiene mientras el raton esta encima o el teclado esta
//     dentro, para que no cambie justo cuando la estan mirando.
//   · La primera foto se carga con prioridad y las demas despues, para
//     que la pagina abra rapido en el celular.
// =============================================================

export type Diapositiva = {
  src: string;
  alt: string;
  position?: string; // que parte no se puede recortar (la cara)
};

export default function BannerRotativo({
  fotos,
  intervaloMs = 5000,
}: {
  fotos: Diapositiva[];
  intervaloMs?: number;
}) {
  const [actual, setActual] = useState(0);
  const [detenido, setDetenido] = useState(false);
  const reducido = useRef(false);

  useEffect(() => {
    try {
      reducido.current = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
    } catch {
      reducido.current = false;
    }
  }, []);

  const siguiente = useCallback(() => {
    setActual((i) => (i + 1) % fotos.length);
  }, [fotos.length]);

  useEffect(() => {
    if (fotos.length <= 1 || detenido || reducido.current) return;
    const t = window.setInterval(siguiente, intervaloMs);
    return () => window.clearInterval(t);
  }, [fotos.length, detenido, siguiente, intervaloMs]);

  if (fotos.length === 0) return null;

  return (
    <div
      className="relative w-full aspect-[4/3] md:aspect-[16/9] overflow-hidden bg-k-hueso"
      onMouseEnter={() => setDetenido(true)}
      onMouseLeave={() => setDetenido(false)}
      onFocusCapture={() => setDetenido(true)}
      onBlurCapture={() => setDetenido(false)}
      aria-roledescription="carrusel"
      aria-label="Fotos de Kona"
    >
      {fotos.map((f, i) => (
        <div
          key={f.src}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === actual ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={i !== actual}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={f.src}
            alt={f.alt}
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "auto"}
            className={`w-full h-full object-cover ${f.position ?? ""}`}
          />
        </div>
      ))}

      {/* puntitos para pasar las fotos a mano */}
      {fotos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2.5">
          {fotos.map((f, i) => (
            <button
              key={f.src}
              type="button"
              onClick={() => setActual(i)}
              aria-label={`Ver foto ${i + 1} de ${fotos.length}`}
              aria-current={i === actual}
              className={`h-2.5 rounded-full transition-all ${
                i === actual
                  ? "w-7 bg-white"
                  : "w-2.5 bg-white/60 hover:bg-white/90"
              } shadow`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
