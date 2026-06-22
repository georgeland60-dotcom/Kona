import Link from "next/link";
import { products } from "@/data/products";
import { formatPrice } from "@/lib/format";

// =============================================================
//  DISEÑO ALTERNATIVO "EDITORIAL BOLD" (mas disruptivo)
//  Es solo una propuesta para comparar. No reemplaza tu inicio.
//  Velo en: /v2
// =============================================================

export default function V2() {
  const featured = products.filter((p) => p.featured);
  const hero = featured[0];
  const rest = featured.slice(1);

  return (
    <div className="bg-background">
      {/* HERO de bloque de color */}
      <section className="grid md:grid-cols-2 min-h-[80vh]">
        <div className="bg-accent text-white flex flex-col justify-center px-8 md:px-16 py-16 order-2 md:order-1">
          <p className="uppercase tracking-[0.4em] text-xs mb-6 text-white/80">
            Temporada 2026
          </p>
          <h1 className="leading-[0.85] mb-6">
            <span className="block font-script text-7xl md:text-8xl">Kona</span>
            <span className="block text-5xl md:text-7xl font-bold uppercase tracking-tight">
              Sin reglas
            </span>
          </h1>
          <p className="text-white/85 max-w-sm mb-9 text-lg">
            Moda femenina para mujeres reales. Comodidad que se nota, estilo que
            se siente.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/tienda"
              className="bg-white text-accent px-9 py-4 rounded-none font-bold uppercase tracking-wide text-sm hover:bg-foreground hover:text-white transition"
            >
              Comprar todo
            </Link>
            <Link
              href="/tienda?cat=ropa-de-bano"
              className="border-2 border-white px-9 py-4 font-bold uppercase tracking-wide text-sm hover:bg-white hover:text-accent transition"
            >
              Ropa de baño
            </Link>
          </div>
        </div>

        <div className="relative order-1 md:order-2 min-h-[50vh] md:min-h-0 overflow-hidden">
          {hero?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hero.image}
              alt={hero.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <Link
            href={`/producto/${hero?.slug}`}
            className="absolute bottom-6 right-6 bg-background/90 backdrop-blur px-5 py-3 text-sm font-medium hover:bg-background transition"
          >
            {hero?.name} · {hero && formatPrice(hero.price)} →
          </Link>
        </div>
      </section>

      {/* MARQUESINA */}
      <div className="bg-foreground text-background py-4 overflow-hidden whitespace-nowrap">
        <div className="inline-flex animate-marquee">
          {[0, 1].map((k) => (
            <span key={k} className="inline-flex">
              {[
                "ENVÍO A TODO LIMA",
                "NUEVA TEMPORADA",
                "PAGO SEGURO",
                "CAMBIOS EN 7 DÍAS",
                "HECHO PARA TI",
              ].map((t, idx) => (
                <span
                  key={idx}
                  className="mx-6 uppercase tracking-[0.3em] text-sm font-medium"
                >
                  {t} <span className="text-accent">✦</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* GRILLA EDITORIAL ASIMETRICA */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-24">
        <div className="flex items-end justify-between mb-10">
          <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tight leading-none">
            Lo que <span className="text-accent">amamos</span>
          </h2>
          <Link
            href="/tienda"
            className="hidden md:inline text-sm uppercase tracking-wide underline underline-offset-4 hover:text-accent"
          >
            Ver todo
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {rest.map((p, idx) => {
            // cada 5to producto ocupa el doble (efecto editorial)
            const big = idx % 5 === 0;
            return (
              <Link
                key={p.id}
                href={`/producto/${p.slug}`}
                className={`group relative overflow-hidden ${
                  big ? "col-span-2 row-span-2" : ""
                }`}
              >
                <div
                  className={`placeholder-box overflow-hidden ${
                    big ? "aspect-square" : "aspect-[3/4]"
                  }`}
                >
                  {p.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                    />
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition">
                  <p className="text-white font-medium leading-tight">
                    {p.name}
                  </p>
                  <p className="text-white/90 text-sm">{formatPrice(p.price)}</p>
                </div>
                <span className="absolute top-3 left-3 text-xs font-bold bg-background px-2 py-1">
                  {String(idx + 1).padStart(2, "0")}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* CTA bloque de color */}
      <section className="bg-accent text-white">
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <h2 className="font-script text-6xl md:text-8xl mb-4">¿Lista?</h2>
          <p className="text-white/85 max-w-md mx-auto mb-8 text-lg">
            Encuentra tu próxima prenda favorita. Te lo llevamos a casa.
          </p>
          <Link
            href="/tienda"
            className="inline-block bg-white text-accent px-10 py-4 font-bold uppercase tracking-wide text-sm hover:bg-foreground hover:text-white transition"
          >
            Explorar la tienda
          </Link>
        </div>
      </section>
    </div>
  );
}
