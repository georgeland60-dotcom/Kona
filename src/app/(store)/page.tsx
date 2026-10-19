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
import Testimonios from "@/components/home/Testimonios";
import Instagram from "@/components/home/Instagram";
import PreguntasFrecuentes from "@/components/home/PreguntasFrecuentes";
import { Corazon, Estrella, Flor, Trazo } from "@/components/brand/Garabatos";

// =============================================================
//  INICIO DE LA TIENDA — version alineada al MANUAL DE MARCA
//
//  No se perdio nada: la version anterior esta entera en /inicio-v3
//  y la original en /inicio-anterior.
//
//  Decisiones de diseno, todas con su razon:
//   · Solo mandan los dos colores primarios del manual (fucsia A90061
//     y gris 747678). La paleta secundaria aparece en detalles, que es
//     para lo unico que el manual la autoriza.
//   · La cinta va en gris y la cabecera en fucsia: dos barras fucsia
//     seguidas se peleaban entre si.
//   · La cursiva (Sacramento) se reserva para las frases "especiales",
//     como manda el manual; los contenidos van en la geometrica.
//   · Los valores (COMODA, UNICA, MODERNA, LIBRE) salen del manual,
//     no son texto inventado de relleno.
// =============================================================

// Se arma en cada visita: asi el pop-up de promociones y "Los favoritos"
// reflejan lo que hay ahora, sin tener que publicar la web de nuevo.
export const dynamic = "force-dynamic";

// Mensajes de la cinta. El delivery va primero porque es lo que mas
// preguntan las clientas.
const CINTA = [
  "DELIVERY LIMA EN 3 DÍAS",
  "PROVINCIA EN 7 DÍAS",
  "PAGO SEGURO",
  "CAMBIOS EN 7 DÍAS",
  "VIVE LA MODA CON COMODIDAD",
];

// Los cuatro valores, tal como estan en el manual de marca.
// El titulo va SIEMPRE en fucsia: es el color primario y, ademas, los
// secundarios claros sobre blanco no se leen (el turquesa daba 1.9:1,
// menos de la mitad de lo minimo). El color lo pone la flor, que es
// decorativa y no tiene que leerse.
const VALORES = [
  { titulo: "Cómoda", texto: "Todas las tallas", flor: "text-k-fucsia" },
  { titulo: "Única", texto: "Detalles en cada prenda", flor: "text-k-indigo" },
  { titulo: "Moderna", texto: "Diseños en tendencia", flor: "text-k-turquesa" },
  { titulo: "Libre", texto: "Sin límites al vestir", flor: "text-k-magenta" },
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
    <div className="bg-white text-k-gris-texto">
      <TrackView type="visit" />

      {/* Pop-up de promociones vigentes (no sale si no hay ninguna) */}
      <PromoPopup promos={promos} />

      {/* ---- CINTA DE AVISOS (gris de marca, bajo la cabecera fucsia) ---- */}
      <div className="bg-k-gris-texto text-white overflow-hidden whitespace-nowrap">
        <div className="py-2">
          <div className="inline-flex animate-marquee">
            {[0, 1].map((k) => (
              <span key={k} className="inline-flex">
                {CINTA.map((texto, idx) => (
                  <span
                    key={idx}
                    className="mx-5 uppercase tracking-[0.25em] text-[11px] font-semibold"
                  >
                    {texto}{" "}
                    <Estrella className="w-2.5 h-2.5 text-white/70 align-middle" />
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ---- PORTADA: la frase de marca ---- */}
      <section className="relative bg-k-hueso overflow-hidden">
        {/* garabatos de marca, sueltos como pide el manual */}
        <Flor
          className="absolute top-6 left-6 md:top-10 md:left-14 w-16 h-16 md:w-20 md:h-20 text-k-lila/60"
          variante="linea"
        />
        <Corazon className="absolute top-10 right-8 md:right-16 w-8 h-8 md:w-10 md:h-10 text-k-rosa/55" />
        <Estrella className="absolute bottom-10 left-10 md:left-24 w-7 h-7 text-k-celeste/70" />
        <Estrella className="absolute top-24 right-24 w-4 h-4 text-k-turquesa/60 hidden md:block" />

        <div className="relative max-w-4xl mx-auto px-4 pt-14 pb-12 md:pt-20 md:pb-16 text-center">
          <p className="uppercase tracking-[0.4em] text-xs text-k-gris font-semibold mb-4">
            #KonaGirl
          </p>
          <h1 className="leading-[0.95]">
            <span className="block text-4xl md:text-6xl font-bold tracking-tight text-k-gris-texto">
              Vive Kona,
            </span>
            {/* la cursiva de marca, reservada para las frases especiales */}
            <span className="block font-script text-6xl md:text-8xl text-k-fucsia leading-[1.05] mt-1">
              vive orgullosa de ti
            </span>
          </h1>

          <Trazo className="w-28 h-3 text-k-fucsia/50 mx-auto my-5" />

          <p className="text-k-gris-texto text-lg md:text-xl max-w-xl mx-auto leading-relaxed">
            Ropa pensada para tu cuerpo real, en todas las tallas. Entra por la
            que va contigo hoy.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Link
              href="/tienda"
              className="bg-k-fucsia text-white px-9 py-4 rounded-full font-bold uppercase tracking-wide text-sm hover:bg-k-fucsia-dark transition"
            >
              Ver la tienda
            </Link>
            <Link
              href="/tienda?cat=nuevos-ingresos"
              className="border-2 border-k-fucsia text-k-fucsia px-9 py-4 rounded-full font-bold uppercase tracking-wide text-sm hover:bg-k-fucsia hover:text-white transition"
            >
              Nuevos ingresos
            </Link>
          </div>
        </div>
      </section>

      {/* ---- CUATRO BLOQUES DE CATEGORIA ---- */}
      <section className="max-w-6xl mx-auto px-4 py-14 md:py-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-8">
          {bloques.map(({ block, image, count, href }) => (
            <Link key={block.key} href={href} className="group block">
              <div className="relative aspect-[3/4.4] overflow-hidden rounded-3xl placeholder-box shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt={block.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                />
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
                  <h2 className="text-white text-lg md:text-2xl font-bold leading-tight">
                    {block.name}
                  </h2>
                  <p className="text-white/85 text-sm md:text-base leading-snug mt-1">
                    {block.tagline}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ---- LOS FAVORITOS (ordenados por ventas reales) ---- */}
      <section className="bg-k-hueso border-y border-k-gris-claro">
        <div className="max-w-6xl mx-auto px-4 py-14 md:py-20">
          <div className="text-center mb-8 md:mb-10">
            <p className="uppercase tracking-[0.35em] text-xs text-k-gris font-semibold mb-2">
              Lo más pedido
            </p>
            <h2 className="font-script text-5xl md:text-6xl text-k-fucsia leading-none">
              Los favoritos
            </h2>
            <p className="text-k-gris-texto text-lg md:text-xl max-w-xl mx-auto mt-4 leading-relaxed">
              {favoritos.basedOnSales
                ? "Lo que más se está vendiendo ahora mismo. La lista se ordena sola con cada compra."
                : "Nuestra selección del momento. En cuanto haya ventas, esta lista se ordena sola."}
            </p>
          </div>

          {topColecciones.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2.5 mb-10">
              {topColecciones.map(({ col }) => (
                <Link
                  key={col.slug}
                  href={`/tienda?cat=${col.slug}`}
                  className="border border-k-gris-claro bg-white rounded-full px-5 py-2 text-base text-k-gris-texto hover:border-k-fucsia hover:text-k-fucsia transition"
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
              className="inline-block bg-k-fucsia text-white px-10 py-4 rounded-full font-bold uppercase tracking-wide text-sm hover:bg-k-fucsia-dark transition"
            >
              Ver toda la tienda
            </Link>
          </div>
        </div>
      </section>

      {/* ---- VALORES DE LA MARCA (textuales del manual) ---- */}
      <section className="bg-white">
        <div className="max-w-5xl mx-auto px-4 py-14 md:py-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {VALORES.map((v) => (
            <div key={v.titulo}>
              <Flor
                className={`w-9 h-9 mx-auto mb-3 ${v.flor}`}
                variante="linea"
              />
              <h3 className="font-script text-3xl leading-none text-k-fucsia">
                {v.titulo}
              </h3>
              <p className="text-k-gris text-sm md:text-base mt-1.5 leading-snug">
                {v.texto}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- TESTIMONIOS REALES ---- */}
      <Testimonios />

      {/* ---- INSTAGRAM ---- */}
      <Instagram productos={products} />

      {/* ---- PREGUNTAS FRECUENTES ---- */}
      <PreguntasFrecuentes />

      {/* ---- CIERRE ---- */}
      <section className="bg-k-fucsia text-white">
        <div className="max-w-3xl mx-auto px-4 py-16 md:py-20 text-center">
          <Corazon className="w-10 h-10 mx-auto mb-4 text-white/80" />
          <h2 className="font-script text-5xl md:text-7xl leading-none">
            vive la moda con comodidad
          </h2>
          <p className="text-white/90 text-lg md:text-xl max-w-md mx-auto mt-5 leading-relaxed">
            Escríbenos y te ayudamos a encontrar tu talla.
          </p>
          <Link
            href="/contacto"
            className="inline-block mt-8 bg-white text-k-fucsia px-10 py-4 rounded-full font-bold uppercase tracking-wide text-sm hover:bg-k-hueso transition"
          >
            Hablar con Kona
          </Link>
        </div>
      </section>
    </div>
  );
}
