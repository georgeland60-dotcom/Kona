"use client";

import { useState } from "react";

// Galería de fotos del producto: imagen grande + miniaturas.
export default function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const gallery = images.filter(Boolean);
  const [active, setActive] = useState(0);

  if (gallery.length === 0) {
    return (
      <div className="aspect-[3/4] placeholder-box rounded-xl overflow-hidden flex items-center justify-center p-6 text-center">
        <span className="font-script text-4xl text-accent/70">{name}</span>
      </div>
    );
  }

  return (
    // Móvil: foto grande arriba, miniaturas en fila debajo.
    // Desktop (md+): miniaturas en columna a la izquierda.
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      {/* Miniaturas */}
      {gallery.length > 1 && (
        <div className="flex flex-row gap-3 overflow-x-auto md:flex-col md:w-20 md:max-h-[640px] md:overflow-y-auto md:overflow-x-visible shrink-0 pb-1 md:pb-0 md:pr-1">
          {gallery.map((src, i) => (
            <button
              key={src}
              onClick={() => setActive(i)}
              className={`w-16 md:w-full shrink-0 aspect-[3/4] rounded-lg overflow-hidden border-2 transition ${
                i === active
                  ? "border-accent"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
              aria-label={`Ver foto ${i + 1} de ${name}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${name} ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Imagen principal (proporción natural, sin recorte) */}
      <div className="flex-1 placeholder-box rounded-xl overflow-hidden self-start">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={gallery[active]}
          alt={name}
          className="w-full h-auto object-contain"
        />
      </div>
    </div>
  );
}
