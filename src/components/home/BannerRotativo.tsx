"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

// =============================================================
//  CARRUSEL DE LA PORTADA
//  Va pasando las fotos solo y deja cambiarlas con los puntitos.
//
//  El marco es VERTICAL (4:5) a proposito: las fotos de moda que
//  tenemos son verticales, y meterlas en un marco ancho les cortaba
//  la cabeza. Un marco del mismo formato que la foto no recorta nada
//  importante y es, ademas, como se ven las portadas de moda.
//
//  Cuidados que no se ven pero importan:
//   · Si el telefono pide "menos movimiento", no rota sola.
//   · Se detiene mientras el raton esta encima o el teclado dentro.
//   · La primera foto se carga con prioridad; las demas, despues.
// =============================================================

export type Diapositiva = {
  src: string;
  alt: string;
  position?: string;
};

export default function BannerRotativo({
  fotos,
  intervaloMs = 5500,
  sizes,
}: {
  fotos: Diapositiva[];
  intervaloMs?: number;
  sizes: string;
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
      className="relative w-full h-full overflow-hidden bg-k-gris-claro"
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
          className={`absolute inset-0 transition-opacity duration-[900ms] ease-out ${
            i === actual ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={i !== actual}
        >
          <Image
            src={f.src}
            alt={f.alt}
            fill
            sizes={sizes}
            // Solo la primera se carga con prioridad: es la que la
            // clienta ve al abrir. Las otras cinco esperan, para no
            // gastarle medio mega de datos del celular de entrada.
            priority={i === 0}
            quality={88}
            className={`object-cover ${f.position ?? "object-center"}`}
          />
        </div>
      ))}

      {fotos.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
          {fotos.map((f, i) => (
            <button
              key={f.src}
              type="button"
              onClick={() => setActual(i)}
              aria-label={`Ver foto ${i + 1} de ${fotos.length}`}
              aria-current={i === actual}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === actual ? "w-8 bg-white" : "w-1.5 bg-white/55 hover:bg-white"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
