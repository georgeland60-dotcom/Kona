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
import { fotosPortada, fotosHistoria } from "@/data/fotos-marca";
import BannerRotativo from "@/components/home/BannerRotativo";

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

      {/* ---- CINTA DE AVISOS (negra, bajo la cabecera fucsia) ---- */}
      <div className="bg-black text-white overflow-hidden whitespace-nowrap">
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

      {/* ---- PORTADA: carrusel de fotos + la frase ----
           Las fotos van a todo lo ancho y van rotando solas. El texto
           no se pone encima a proposito: varias de estas fotos ya
           traen su propio mensaje escrito ("Vivo orgullosa de mi"),
           y superponerle otro titulo las ensuciaria. Por eso la frase
           de marca va en la franja fucsia de abajo.
           Para cambiar o reordenar las fotos: src/data/fotos-marca.ts */}
      <section>
        <BannerRotativo fotos={fotosPortada} />
      </section>

      <section className="relative bg-k-fucsia text-white overflow-hidden">
        <Flor
          className="absolute -top-2 right-6 w-20 h-20 text-white/15 hidden md:block"
          variante="linea"
        />
        <Estrella className="absolute bottom-6 left-8 w-6 h-6 text-white/20 hidden md:block" />

        <div className="relative max-w-5xl mx-auto px-4 py-10 md:py-14 text-center">
          <p className="uppercase tracking-[0.4em] text-xs text-white/80 font-semibold mb-3">
            #KonaGirl
          </p>
          <h1 className="leading-[0.95]">
            <span className="block text-3xl md:text-5xl font-bold tracking-tight">
              Vive Kona,
            </span>
            {/* la cursiva de marca, reservada a las frases especiales */}
            <span className="block font-script text-5xl md:text-7xl leading-[1.05] mt-1">
              vive orgullosa de ti
            </span>
          </h1>

          <Trazo className="w-24 h-3 text-white/60 mx-auto my-4" />

          <p className="text-white/90 text-lg md:text-xl max-w-xl mx-auto leading-relaxed">
            Ropa pensada para tu cuerpo real, en todas las tallas.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mt-7">
            <Link
              href="/tienda"
              className="bg-white text-k-fucsia px-9 py-4 rounded-full font-bold uppercase tracking-wide text-sm hover:bg-k-hueso transition"
            >
              Ver la tienda
            </Link>
            <Link
              href="/tienda?cat=nuevos-ingresos"
              className="border-2 border-white text-white px-9 py-4 rounded-full font-bold uppercase tracking-wide text-sm hover:bg-white hover:text-k-fucsia transition"
            >
              Nuevos ingresos
            </Link>
          </div>
        </div>
      </section>

      {/* ---- CUATRO BLOQUES DE CATEGORIA ---- */}
      <section className="bg-k-hueso">
        <div className="max-w-6xl mx-auto px-4 py-14 md:py-20">
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
        </div>
      </section>

      {/* ---- BANNER DEL MEDIO ----
           Va en el lila del manual (#E0B5DF). Ojo con el texto: el lila
           es claro, y en blanco daba 1.8:1 de contraste, o sea no se
           leia. Por eso el titulo va en fucsia y el cuerpo en un gris
           oscuro que llega a 5.8:1.
           Las tres fotos se leen como una frase seguida: "self love" ->
           "es poder elegir" -> "es estar siempre lista para vivir".
           Para cambiarlas: src/data/fotos-marca.ts */}
      <section className="bg-k-lila">
        <div className="max-w-6xl mx-auto px-4 py-14 md:py-20">
          <div className="text-center max-w-2xl mx-auto">
            <p className="uppercase tracking-[0.4em] text-xs text-k-gris-oscuro font-semibold mb-3">
              Hecho para ti
            </p>
            <h2 className="font-script text-5xl md:text-7xl text-k-fucsia leading-[1.05]">
              quiérete en todas tus tallas
            </h2>
            <p className="text-k-gris-oscuro text-lg md:text-xl mt-5 leading-relaxed">
              Cada prenda se piensa para cuerpos reales: tallas que de verdad
              existen y detalles que se notan al ponértela.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 md:gap-6 mt-10 md:mt-12">
            {fotosHistoria.map((f) => (
              <div
                key={f.src}
                className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-white/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.src}
                  alt={f.alt}
                  className={`absolute inset-0 w-full h-full object-cover ${f.position ?? ""}`}
                />
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/nosotros"
              className="inline-block bg-k-fucsia text-white px-9 py-4 rounded-full font-bold uppercase tracking-wide text-sm hover:bg-k-fucsia-dark transition"
            >
              Conoce Kona
            </Link>
          </div>
        </div>
      </section>

      {/* ---- LOS FAVORITOS (ordenados por ventas reales) ---- */}
      <section className="bg-white">
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

      {/* ---- TESTIMONIOS REALES ---- */}
      <Testimonios />

      {/* ---- VALORES DE LA MARCA (textuales del manual) ---- */}
      <section className="bg-k-lila/25">
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
