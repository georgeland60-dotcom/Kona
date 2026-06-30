import Link from "next/link";
import { getProducts } from "@/lib/store-data";
import { getActiveBanners } from "@/lib/promos-data";
import { formatPrice } from "@/lib/format";
import ProductGrid from "@/components/product/ProductGrid";
import HeroSlider from "@/components/layout/HeroSlider";
import TrackView from "@/components/TrackView";
import { homeCollections, pickCollection } from "@/data/collections";

export default async function Home() {
  const [products, banners] = await Promise.all([
    getProducts(),
    getActiveBanners(),
  ]);
  const favoritos = products.filter((p) => p.featured);
  const colecciones = homeCollections
    .map((c) => ({ col: c, items: pickCollection(products, c) }))
    .filter((c) => c.items.length > 0);

  return (
    <div className="bg-background">
      <TrackView type="visit" />

      {/* HERO SLIDER (banner Ropa de baño) */}
      <HeroSlider banners={banners} />

      {/* MARQUESINA (estilo v2) */}
      <div className="bg-black text-white py-4 overflow-hidden whitespace-nowrap">
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

      {/* GRILLA EDITORIAL "LO QUE AMAMOS" (estilo v2) */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-20">
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
          {favoritos.map((p, idx) => {
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
                  <p className="text-white font-medium leading-tight">{p.name}</p>
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

      {/* COLECCIONES TEMÁTICAS */}
      {colecciones.map(({ col, items }) => (
        <section
          key={col.slug}
          className="max-w-6xl mx-auto px-4 py-12 border-t border-line"
        >
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tight">
                {col.title}
              </h2>
              <p className="text-muted text-sm mt-1">{col.subtitle}</p>
            </div>
            <Link
              href={`/tienda?cat=${col.slug}`}
              className="text-sm text-accent hover:text-accent-dark whitespace-nowrap font-medium"
            >
              Ver todos →
            </Link>
          </div>
          <ProductGrid products={items} />
        </section>
      ))}

      {/* CTA BLOQUE DE COLOR (estilo v2) */}
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

      {/* FRANJA DE CONFIANZA */}
      <section className="bg-soft border-y border-line">
        <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            {
              title: "Delivery",
              text: "Hacemos delivery a todo Lima",
              icon: (
                <>
                  <rect x="1" y="3" width="15" height="13" rx="1" />
                  <path d="M16 8h4l3 3v5h-7z" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </>
              ),
            },
            {
              title: "Pago Seguro",
              text: "Pago seguro, todos los medios",
              icon: (
                <>
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path d="M2 10h20" />
                </>
              ),
            },
            {
              title: "Excelente Servicio",
              text: "Te ayudamos en todo momento",
              icon: (
                <>
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </>
              ),
            },
            {
              title: "Cambios permitidos",
              text: "Hasta 7 días después de la compra",
              icon: (
                <>
                  <path d="M3 2v6h6" />
                  <path d="M3 8a9 9 0 1 0 2.5-3.5L3 8" />
                </>
              ),
            },
          ].map((b) => (
            <div key={b.title} className="flex flex-col items-center">
              <svg
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-accent mb-3"
              >
                {b.icon}
              </svg>
              <h3 className="text-sm font-medium mb-1">{b.title}</h3>
              <p className="text-xs text-muted leading-relaxed max-w-[12rem]">
                {b.text}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
