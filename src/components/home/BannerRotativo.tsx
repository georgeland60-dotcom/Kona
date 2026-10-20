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
  velo?: "suave" | "medio" | "fuerte";
};

// =============================================================
//  EL VELO DE CADA FOTO
//  Encima de la foto va texto blanco, y una foto clara se lo come.
//  Pero oscurecerlas todas por igual apaga las que ya eran oscuras,
//  que son la mayoria. Asi que cada foto trae escrito cuanto velo
//  necesita, medido una por una.
//
//  Son dos capas, y las dos mueren antes de llegar a la mitad de la
//  foto: una franja abajo y un charco ovalado en la esquina de abajo
//  a la izquierda, que es donde vive el texto. Arriba (las caras, el
//  cielo, el texto que ya trae cada banner) no se toca.
//
//  Gris neutro a proposito: un velo de color le cambia el tono a la
//  ropa, y en una tienda de ropa eso no se puede hacer.
//
//  Las clases van escritas enteras porque Tailwind lee el archivo
//  como texto: un nombre de clase armado a pedazos no existiria.
// =============================================================
//  En CELULAR, cuando el texto va encima de la foto, el velo tiene que
//  ser distinto: alli el texto ocupa casi todo el ancho, asi que no
//  sirve un charco en una esquina; hace falta una franja de abajo a
//  todo lo ancho, y mas cargada, porque la pantalla es pequena y el
//  texto queda mas pegado a la foto.
const VELOS_CELULAR = {
  suave:
    "bg-[linear-gradient(to_top,rgba(0,0,0,0.66)_0%,rgba(0,0,0,0.36)_24%,rgba(0,0,0,0)_50%)]",
  medio:
    "bg-[linear-gradient(to_top,rgba(0,0,0,0.74)_0%,rgba(0,0,0,0.46)_26%,rgba(0,0,0,0)_54%)]",
  fuerte:
    "bg-[linear-gradient(to_top,rgba(0,0,0,0.82)_0%,rgba(0,0,0,0.58)_30%,rgba(0,0,0,0)_60%)]",
} as const;

const VELOS = {
  suave: {
    franja:
      "bg-[linear-gradient(to_top,rgba(0,0,0,0.38)_0%,rgba(0,0,0,0.12)_14%,rgba(0,0,0,0)_28%)]",
    charco:
      "bg-[radial-gradient(130%_100%_at_0%_100%,rgba(0,0,0,0.42)_0%,rgba(0,0,0,0.20)_38%,rgba(0,0,0,0)_70%)]",
  },
  medio: {
    franja:
      "bg-[linear-gradient(to_top,rgba(0,0,0,0.46)_0%,rgba(0,0,0,0.16)_15%,rgba(0,0,0,0)_32%)]",
    charco:
      "bg-[radial-gradient(130%_100%_at_0%_100%,rgba(0,0,0,0.56)_0%,rgba(0,0,0,0.30)_38%,rgba(0,0,0,0)_70%)]",
  },
  fuerte: {
    franja:
      "bg-[linear-gradient(to_top,rgba(0,0,0,0.56)_0%,rgba(0,0,0,0.24)_18%,rgba(0,0,0,0)_38%)]",
    charco:
      "bg-[radial-gradient(140%_110%_at_0%_100%,rgba(0,0,0,0.76)_0%,rgba(0,0,0,0.50)_40%,rgba(0,0,0,0)_74%)]",
  },
} as const;

export default function BannerRotativo({
  fotos,
  intervaloMs = 5500,
  sizes,
  veloEnCelular = false,
}: {
  fotos: Diapositiva[];
  intervaloMs?: number;
  sizes: string;
  // Solo se enciende cuando el texto va encima de la foto tambien en
  // celular. Por defecto el celular no lleva velo, porque alli el
  // texto va debajo sobre fucsia y no hay nada que leer sobre la foto.
  veloEnCelular?: boolean;
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

          {/* El velo viaja con su foto, asi que se desvanece junto con
              ella y nunca se ve el velo de una sobre la otra. En
              celular no hace falta: alli el texto va debajo, sobre
              fucsia. pointer-events-none o se tragaria los clics de
              los puntitos, que estan debajo en el HTML. */}
          {veloEnCelular && (
            <div
              aria-hidden="true"
              className={`md:hidden absolute inset-0 pointer-events-none ${
                VELOS_CELULAR[f.velo ?? "medio"]
              }`}
            />
          )}
          <div
            aria-hidden="true"
            className={`hidden md:block absolute inset-0 pointer-events-none ${
              VELOS[f.velo ?? "medio"].franja
            }`}
          />
          <div
            aria-hidden="true"
            className={`hidden md:block absolute inset-0 pointer-events-none ${
              VELOS[f.velo ?? "medio"].charco
            }`}
          />
        </div>
      ))}

      {fotos.length > 1 && (
        <div className="absolute bottom-5 right-5 md:right-8 flex gap-2">
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
