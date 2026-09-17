import Link from "next/link";
import { getProducts } from "@/lib/store-data";
import { getActiveBanners, getLiveRules } from "@/lib/promos-data";
import { getCategorias } from "@/lib/categorias-data";
import { buildPromos } from "@/lib/promos-display";
import { getBestSellers, getTopCollections } from "@/lib/bestsellers";
import { resolveBlocks } from "@/data/home-blocks";
import ProductGrid from "@/components/product/ProductGrid";
import PromoPopup from "@/components/promo/PromoPopup";
import TrackView from "@/components/TrackView";

// =============================================================
//  INICIO DE LA TIENDA
//  Este es el inicio que ve la clienta. El inicio anterior no se
//  perdio: sigue completo en /inicio-anterior, y /v3 (la direccion
//  con la que se estuvo revisando) redirige aqui.
//
//  Que trae:
//   1. Cinta de avisos en el fucsia de la marca, con los tiempos
//      de delivery.
//   2. Cuatro bloques verticales de categoria con foto y nombre.
//   3. Pop-up dinamico con las promociones vigentes.
//   4. Una sola seccion abajo: "Los favoritos", ordenada por ventas.
// =============================================================

// Esta pagina se arma en cada visita, no al compilar. Es lo que hace que
// el pop-up y "Los favoritos" sean de verdad dinamicos: si en /admin se
// prende una promocion o entra una venta, se ve al recargar, sin tener
// que publicar la web de nuevo.
export const dynamic = "force-dynamic";

// Mensajes de la cinta. El delivery va primero porque es lo que mas
// preguntan las clientas. Cada uno lleva su color de estrella.
const CINTA = [
  "DELIVERY LIMA EN 3 DÍAS",
  "PROVINCIA EN 7 DÍAS",
  "PAGO SEGURO",
  "CAMBIOS EN 7 DÍAS",
  "NUEVA TEMPORADA",
];

export default async function Home() {
  const [products, banners, rules, categorias] = await Promise.all([
    getProducts(),
    getActiveBanners(),
    getLiveRules(),
    getCategorias(),
  ]);

  const promos = buildPromos(rules, banners, products, categorias);
  const bloques = resolveBlocks(products);
  const [favoritos, topColecciones] = await Promise.all([
    getBestSellers(products, 8),
    getTopCollections(products, 4),
  ]);

  return (
    <div className="bg-v3-cream text-v3-ink">
      <TrackView type="visit" />

      {/* 3. POP-UP DE PROMOCIONES (se muestra solo si hay alguna vigente) */}
      <PromoPopup promos={promos} />

      {/* 1. CINTA DE AVISOS — en el fucsia de la marca, letras blancas */}
      <div className="bg-accent text-white overflow-hidden whitespace-nowrap">
        <div className="py-2">
          <div className="inline-flex animate-marquee">
            {[0, 1].map((k) => (
              <span key={k} className="inline-flex">
                {CINTA.map((texto, idx) => (
                  <span
                    key={idx}
                    className="mx-5 uppercase tracking-[0.25em] text-[11px] font-semibold"
                  >
                    {texto} <span className="text-white/60">✦</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 2. CUATRO BLOQUES VERTICALES DE CATEGORIA */}
      <section className="max-w-6xl mx-auto px-4 pt-12 pb-14 md:pt-16 md:pb-20">
        <div className="text-center mb-10 md:mb-12">
          <p className="uppercase tracking-[0.35em] text-xs text-accent font-semibold mb-3">
            #KonaGirl
          </p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[0.95]">
            Siente Kona,{" "}
            <span className="text-accent">siéntete libre</span>
          </h1>
          {/* letra de apoyo mas grande (antes era text-sm) */}
          <p className="text-v3-ink-soft text-lg md:text-xl max-w-xl mx-auto mt-4 leading-relaxed">
            Cuatro formas de empezar. Entra por la que va contigo hoy.
          </p>
        </div>

        {/* bloques verticales y bien espaciados entre si */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-8">
          {bloques.map(({ block, image, count, href }) => (
            <Link key={block.key} href={href} className="group block">
              <div className="relative aspect-[3/4.4] overflow-hidden rounded-2xl placeholder-box shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt={block.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                />
                {/* velo oscuro para que el nombre se lea siempre */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

                {count === 0 && (
                  <span
                    className={`absolute top-3 left-3 text-white text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${block.badge}`}
                  >
                    Próximamente
                  </span>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                  <span
                    aria-hidden="true"
                    className={`block w-10 h-1 rounded-full mb-3 ${block.bar}`}
                  />
                  {/* en celular el bloque es angosto: letra algo menor para
                      que nombres largos no se partan feo */}
                  <h2 className="text-white text-lg md:text-2xl font-bold leading-tight">
                    {block.name}
                  </h2>
                  {/* letra de apoyo mas grande */}
                  <p className="text-white/85 text-sm md:text-base leading-snug mt-1">
                    {block.tagline}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. UNICA SECCION DE ABAJO: LOS FAVORITOS (por ventas) */}
      <section className="bg-white border-t border-line">
        <div className="max-w-6xl mx-auto px-4 py-14 md:py-20">
          <div className="text-center mb-8 md:mb-10">
            <p className="uppercase tracking-[0.35em] text-xs text-v3-teal font-semibold mb-3">
              Lo más pedido
            </p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Los <span className="text-v3-primary">favoritos</span>
            </h2>
            <p className="text-v3-ink-soft text-lg md:text-xl max-w-xl mx-auto mt-4 leading-relaxed">
              {favoritos.basedOnSales
                ? "Lo que más se está vendiendo ahora mismo. La lista se ordena sola con cada compra."
                : "Nuestra selección del momento. En cuanto haya ventas, esta lista se ordena sola."}
            </p>
          </div>

          {/* colecciones con mayor venta, en orden dinamico */}
          {topColecciones.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2.5 mb-10">
              {topColecciones.map(({ col }) => (
                <Link
                  key={col.slug}
                  href={`/tienda?cat=${col.slug}`}
                  className="border border-line rounded-full px-5 py-2 text-base text-v3-ink hover:border-v3-primary hover:text-v3-primary transition"
                >
                  {col.title}
                </Link>
              ))}
            </div>
          )}

          <ProductGrid products={favoritos.items} />

          <div className="text-center mt-12">
            <Link
              href="/tienda"
              className="inline-block bg-v3-primary text-white px-10 py-4 rounded-full font-bold uppercase tracking-wide text-sm hover:bg-v3-ink transition"
            >
              Ver toda la tienda
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
