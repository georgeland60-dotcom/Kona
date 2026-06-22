"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Banner } from "@/lib/types";

export default function HeroSlider({ banners }: { banners: Banner[] }) {
  const [i, setI] = useState(0);
  const n = banners.length;

  const go = (idx: number) => setI((idx + n) % n);

  // Avanza solo cada 5 segundos
  useEffect(() => {
    if (n <= 1) return;
    const t = setInterval(() => setI((v) => (v + 1) % n), 5000);
    return () => clearInterval(t);
  }, [n]);

  if (n === 0) return null;

  return (
    <section className="relative overflow-hidden bg-soft">
      <div className="relative">
        {banners.map((b, idx) => (
          <div
            key={b.id}
            className={`transition-opacity duration-700 ${
              idx === i
                ? "opacity-100"
                : "opacity-0 pointer-events-none absolute inset-0"
            }`}
          >
            <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 items-center gap-8 min-h-[26rem] md:min-h-[32rem]">
              {/* Texto */}
              <div className="order-2 md:order-1 text-center md:text-left py-8 md:py-0">
                <p className="uppercase tracking-[0.3em] text-xs text-accent mb-3">
                  {b.eyebrow}
                </p>
                <h2 className="font-script text-5xl md:text-7xl text-accent leading-tight mb-4">
                  {b.title}
                </h2>
                <p className="text-muted max-w-sm mx-auto md:mx-0 mb-7">
                  {b.text}
                </p>
                <Link
                  href={b.href}
                  className="inline-block bg-foreground text-background px-8 py-3 rounded-full hover:bg-accent transition"
                >
                  {b.cta}
                </Link>
              </div>

              {/* Imagen */}
              <div className="order-1 md:order-2 flex justify-center">
                <div className="w-56 md:w-80 aspect-[3/4] rounded-2xl overflow-hidden shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={b.image}
                    alt={b.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {n > 1 && (
        <>
          {/* Flechas */}
          <button
            onClick={() => go(i - 1)}
            aria-label="Anterior"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 hover:bg-background shadow flex items-center justify-center"
          >
            ‹
          </button>
          <button
            onClick={() => go(i + 1)}
            aria-label="Siguiente"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 hover:bg-background shadow flex items-center justify-center"
          >
            ›
          </button>

          {/* Puntos */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((b, idx) => (
              <button
                key={b.id}
                onClick={() => go(idx)}
                aria-label={`Ir al banner ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  idx === i ? "w-6 bg-accent" : "w-2 bg-muted/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
