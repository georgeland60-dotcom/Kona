import Link from "next/link";
import { getProducts } from "@/lib/store-data";
import { getActiveBanners } from "@/lib/promos-data";
import ProductGrid from "@/components/product/ProductGrid";
import HeroSlider from "@/components/layout/HeroSlider";
import TrackView from "@/components/TrackView";

export default async function Home() {
  const [products, banners] = await Promise.all([
    getProducts(),
    getActiveBanners(),
  ]);
  const favoritos = products.filter((p) => p.featured);

  return (
    <div>
      <TrackView type="visit" />
      {/* HERO SLIDER */}
      <HeroSlider banners={banners} />

      {/* FAVORITOS */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h2 className="font-script text-5xl text-accent mb-1">Favoritos</h2>
          <p className="text-muted text-sm">Lo mas querido de la temporada</p>
        </div>
        <ProductGrid products={favoritos} />
        <div className="text-center mt-12">
          <Link
            href="/tienda"
            className="inline-block border border-foreground px-8 py-3 rounded-full hover:bg-foreground hover:text-background transition"
          >
            Ver toda la tienda
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
