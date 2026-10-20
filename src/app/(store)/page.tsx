import Link from "next/link";
import { getProducts } from "@/lib/store-data";
import { getActiveBanners, getLiveRules } from "@/lib/promos-data";
import { getCategorias } from "@/lib/categorias-data";
import { buildPromos } from "@/lib/promos-display";
import { getBestSellers, getTopCollections } from "@/lib/bestsellers";
import { resolveBlocks } from "@/data/home-blocks";
import { fotosPortada, fotoIntermedia } from "@/data/fotos-marca";
import ProductGrid from "@/components/product/ProductGrid";
import PromoPopup from "@/components/promo/PromoPopup";
import TrackView from "@/components/TrackView";
import Testimonios from "@/components/home/Testimonios";
import Instagram from "@/components/home/Instagram";
import PreguntasFrecuentes from "@/components/home/PreguntasFrecuentes";
import BannerRotativo from "@/components/home/BannerRotativo";
import Revelar from "@/components/home/Revelar";
import Foto from "@/components/brand/Foto";
import { Corazon, Estrella, Flor, Trazo } from "@/components/brand/Garabatos";

// =============================================================
//  INICIO DE LA TIENDA
//
//  No se perdio nada: /inicio-v3 guarda la version anterior y
//  /inicio-anterior la original.
//
//  LO QUE SE ARREGLO Y POR QUE (se veia pixelado y con fotos raras):
//   1. Ninguna foto se muestra ya mas ancha de lo que mide. La de la
//      portada tiene 1015 px y estaba puesta a lo ancho de pantallas
//      de 2880: se estiraba casi al triple. Ahora viven en columnas
//      limitadas y se sirven con next/image, que manda la medida
//      justa a cada pantalla.
//   2. Cada foto va en un marco de SU formato. Antes las verticales
//      estaban metidas en un marco 16:9 y les cortaba la cabeza.
//      Ahora: verticales en 4:5, la horizontal en 3:2.
//
//  SISTEMA VISUAL (para que se vea de marca y no de plantilla):
//   · Mandan los dos primarios del manual, fucsia y gris. Los
//     secundarios solo tocan detalles.
//   · Un solo ritmo de aire entre secciones (py-16 md:py-24).
//   · Un solo juego de esquinas: redondeado grande en fotos, redondo
//     completo en botones.
//   · La cursiva (Sacramento) se reserva a las frases especiales,
//     como manda el manual.
// =============================================================

export const dynamic = "force-dynamic";

const CINTA = [
  "DELIVERY LIMA EN 3 DÍAS",
  "PROVINCIA EN 7 DÍAS",
  "CAMBIOS EN 7 DÍAS",
  "PAGO SEGURO",
  "VIVE LA MODA CON COMODIDAD",
];

// Los cuatro valores, textuales del manual de marca.
const VALORES = [
  { titulo: "Cómoda", texto: "Todas las tallas", flor: "text-k-fucsia" },
  { titulo: "Única", texto: "Detalles en cada prenda", flor: "text-k-indigo" },
  { titulo: "Moderna", texto: "Diseños en tendencia", flor: "text-k-turquesa" },
  { titulo: "Libre", texto: "Sin límites al vestir", flor: "text-k-magenta" },
];

// El texto de la portada. Se escribe una sola vez y se usa en los dos
// sitios (encima de la foto en escritorio, debajo en celular) para que
// no se pueda quedar uno desactualizado respecto del otro.
function TextoPortada({ sobreFoto }: { sobreFoto: boolean }) {
  return (
    <div className="max-w-xl">
      {/* Encima de la foto esta linea va en una pastilla fucsia. Es la
          letra mas chica de toda la portada y, suelta sobre la foto,
          caia a 1.8:1 en el banner de los sweaters celestes: ilegible.
          Sobre el fucsia de la marca se lee a 7:1 en cualquier banner,
          y de paso mete el color de Kona en la portada sin oscurecer
          nada de la foto. */}
      <p className="mb-2 md:mb-3">
        <span
          className={`inline-block uppercase tracking-[0.45em] text-[10px] md:text-[11px] font-semibold ${
            sobreFoto
              ? "bg-k-fucsia text-white rounded-full pl-3 pr-1.5 py-1.5"
              : "text-white/80"
          }`}
        >
          #KonaGirl
        </span>
      </p>
      <h1
        className={`leading-[0.9] text-white ${
          sobreFoto ? "[text-shadow:0_2px_14px_rgba(0,0,0,0.55)]" : ""
        }`}
      >
        <span className="block text-2xl md:text-4xl font-bold tracking-tight">
          Vive Kona,
        </span>
        <span className="block font-script text-4xl md:text-6xl leading-[1.1] mt-0.5">
          vive orgullosa de ti
        </span>
      </h1>

      <p
        className={`text-white/90 text-sm md:text-lg max-w-md mt-3 leading-relaxed ${
          sobreFoto ? "[text-shadow:0_1px_10px_rgba(0,0,0,0.6)]" : ""
        }`}
      >
        Ropa pensada para tu cuerpo real, en todas las tallas.
      </p>

      <div className="flex flex-wrap gap-2.5 md:gap-3 mt-4 md:mt-6">
        <Link
          href="/tienda"
          className={`px-6 md:px-9 py-3 md:py-3.5 rounded-full font-semibold uppercase tracking-[0.12em] text-[11px] md:text-xs transition-colors ${
            sobreFoto
              ? "bg-k-fucsia text-white hover:bg-k-fucsia-dark"
              : "bg-white text-k-fucsia hover:bg-k-hueso"
          }`}
        >
          Ver la tienda
        </Link>
        <Link
          href="/tienda?cat=nuevos-ingresos"
          className={`px-6 md:px-9 py-3 md:py-3.5 rounded-full font-semibold uppercase tracking-[0.12em] text-[11px] md:text-xs transition-colors ${
            sobreFoto
              ? "bg-white/95 text-k-gris-texto hover:bg-white"
              : "border border-white/70 text-white hover:bg-white hover:text-k-fucsia"
          }`}
        >
          Nuevos ingresos
        </Link>
      </div>
    </div>
  );
}

export default async function Home(props: PageProps<"/">) {
  // PRUEBA, para poder comparar en el mismo telefono:
  //   /            -> la frase va DEBAJO, en la franja fucsia
  //   /?portada=encima -> la frase va ENCIMA de la foto
  // Es temporal: cuando se decida cual queda, se deja una sola y esto
  // se borra. La pagina ya era dynamic, asi que leer la URL no cambia
  // como se renderiza.
  const encimaEnCelular = (await props.searchParams).portada === "encima";

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
      <PromoPopup promos={promos} />

      {/* ---- CINTA DE AVISOS ----
           En el rosa de la paleta. No lleva letra blanca: sobre este
           rosa daria 2.4:1 y no se leeria. Con la tinta oscura llega
           a 5.3:1. Y se distingue del encabezado, que ya es fucsia. */}
      <div className="bg-k-rosa text-k-tinta overflow-hidden whitespace-nowrap">
        <div className="py-2.5">
          <div className="inline-flex animate-marquee">
            {[0, 1].map((k) => (
              <span key={k} className="inline-flex">
                {CINTA.map((texto, idx) => (
                  <span
                    key={idx}
                    className="mx-6 uppercase tracking-[0.3em] text-[10px] font-semibold"
                  >
                    {texto}
                    <Estrella className="w-2 h-2 ml-3 text-k-fucsia align-middle" />
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ---- PORTADA ----
           En ESCRITORIO la frase va encima de la foto, abajo a la
           izquierda, con un velo oscuro para que se lea. Va a la
           izquierda porque estos banners traen su propio texto arriba
           y a la derecha ("swim SALE", "40% OFF"): asi no se pisan.

           En CELULAR no cabe: el banner mide 191 px de alto en una
           pantalla de 390, y el texto encima quedaba ilegible y
           cortado. Ahi la foto se queda sola y la frase baja a una
           franja fucsia debajo.

           Solo una de las dos versiones existe a la vez (la otra esta
           en display:none), asi que un lector de pantalla lee el texto
           una vez, no dos. */}
      <section className="relative">
        <div
          className={`relative w-full overflow-hidden ${
            // Con la frase encima, el celular necesita un marco ALTO o
            // no cabe el texto. El precio esta medido: el banner es
            // casi 2:1 y en un marco 4:5 solo se ve el 39% de su ancho,
            // asi que se pierde el texto que trae pintado a la derecha
            // ("swim SALE", "40% OFF"). En escritorio no cambia nada.
            encimaEnCelular
              ? "aspect-[4/5] md:aspect-[1920/939]"
              : "aspect-[1920/939]"
          }`}
        >
          <BannerRotativo
            fotos={fotosPortada}
            sizes="100vw"
            veloEnCelular={encimaEnCelular}
          />

          {/* El velo que deja leer el texto ya no vive aqui: viaja con
              cada foto dentro de BannerRotativo, porque cada banner
              necesita una cantidad distinta y asi se desvanece junto
              con su propia foto. */}

          <div
            className={`absolute inset-0 items-end pointer-events-none ${
              encimaEnCelular ? "flex" : "hidden md:flex"
            }`}
          >
            <div className="w-full max-w-6xl mx-auto px-5 md:px-8 pb-8 md:pb-14">
              <div className="pointer-events-auto">
                <TextoPortada sobreFoto />
              </div>
            </div>
          </div>
        </div>

        {/* en celular, la frase va debajo (salvo en la prueba de arriba) */}
        {!encimaEnCelular && (
          <div className="md:hidden bg-k-fucsia">
            <div className="px-5 py-8">
              <TextoPortada sobreFoto={false} />
            </div>
          </div>
        )}
      </section>

      {/* ---- CATEGORIAS ---- */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
          <Revelar>
          <div className="flex items-end justify-between mb-8 md:mb-10">
            <div>
              <p className="uppercase tracking-[0.45em] text-[11px] text-k-gris font-semibold mb-2">
                Elige por dónde empezar
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-k-gris-texto">
                Categorías
              </h2>
            </div>
            <Link
              href="/tienda"
              className="hidden md:inline text-xs uppercase tracking-[0.12em] font-semibold text-k-fucsia hover:text-k-fucsia-dark transition-colors"
            >
              Ver todo →
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {bloques.map(({ block, image, count, href }) => (
              <Link key={block.key} href={href} className="group block">
                <div className="relative aspect-[3/4] overflow-hidden rounded-[1.5rem] placeholder-box">
                  <Foto
                    src={image}
                    alt={block.name}
                    sizes="(min-width: 1024px) 270px, 45vw"
                    className="group-hover:scale-[1.04] transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                  {count === 0 && (
                    <span
                      className={`absolute top-3 left-3 text-white text-[9px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full ${block.badge}`}
                    >
                      Próximamente
                    </span>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                    <span
                      aria-hidden="true"
                      className={`block w-8 h-[3px] rounded-full mb-2.5 ${block.bar}`}
                    />
                    <h3 className="text-white text-base md:text-xl font-bold leading-tight">
                      {block.name}
                    </h3>
                    <p className="text-white/80 text-xs md:text-sm leading-snug mt-1">
                      {block.tagline}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          </Revelar>
        </div>
      </section>

      {/* ---- BANNER DEL MEDIO (lila del manual, color 4) ----
           El texto NO va en blanco: sobre este lila da 1.8:1 de
           contraste y no se lee. Titulo en fucsia, cuerpo en gris
           oscuro (5.8:1).
           La foto es la unica horizontal que hay, por eso va en marco
           3:2 y en una columna que no pasa de su tamano real. */}
      <section className="bg-k-lila">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
          <Revelar>
          <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center">
            <div className="relative aspect-[3/2] w-full max-w-[600px] overflow-hidden rounded-[2rem]">
              <Foto
                src={fotoIntermedia.src}
                alt={fotoIntermedia.alt}
                position={fotoIntermedia.position}
                sizes="(min-width: 1024px) 560px, (min-width: 768px) 45vw, 92vw"
              />
            </div>

            <div className="relative">
              <Corazon className="absolute -top-8 right-2 w-8 h-8 text-k-fucsia/30 hidden md:block" />
              <p className="uppercase tracking-[0.45em] text-[11px] text-k-gris-oscuro font-semibold mb-4">
                Hecho para ti
              </p>
              {/* La frase va en dos letras a proposito: la palabra que
                  carga el sentimiento en la manuscrita, y el resto en la
                  de cuerpo. Toda la frase en manuscrita se leia con
                  esfuerzo, sobre todo en celular. */}
              <h2 className="text-k-fucsia">
                <span className="block font-script text-[3.5rem] md:text-[4.5rem] leading-[1.05] pb-1">
                  quiérete
                </span>
                <span className="block text-[1.75rem] md:text-[2.25rem] font-semibold tracking-tight leading-[1.15]">
                  en todas tus tallas
                </span>
              </h2>
              <p className="text-k-gris-oscuro text-lg md:text-xl mt-6 leading-relaxed max-w-md">
                Cada prenda se piensa para cuerpos reales: tallas que de verdad
                existen y detalles que se notan al ponértela.
              </p>
              <Link
                href="/nosotros"
                className="inline-block mt-9 bg-k-fucsia text-white px-10 py-4 rounded-full font-semibold uppercase tracking-[0.12em] text-xs hover:bg-k-fucsia-dark transition-colors"
              >
                Conoce Kona
              </Link>
            </div>
          </div>
          </Revelar>
        </div>
      </section>

      {/* ---- LOS FAVORITOS ---- */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
          <Revelar>
          <div className="text-center mb-10">
            <p className="uppercase tracking-[0.45em] text-[11px] text-k-gris font-semibold mb-3">
              Lo más pedido
            </p>
            <h2 className="font-script text-[3rem] md:text-6xl text-k-fucsia leading-[1.1]">
              Los favoritos
            </h2>
            <p className="text-k-gris-texto text-base md:text-lg max-w-lg mx-auto mt-4 leading-relaxed">
              {favoritos.basedOnSales
                ? "Lo que más se está vendiendo ahora mismo. La lista se ordena sola con cada compra."
                : "Nuestra selección del momento. En cuanto haya ventas, esta lista se ordena sola."}
            </p>
          </div>

          {topColecciones.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-12">
              {topColecciones.map(({ col }) => (
                <Link
                  key={col.slug}
                  href={`/tienda?cat=${col.slug}`}
                  className="border border-k-gris-claro rounded-full px-5 py-2 text-sm text-k-gris-texto hover:border-k-fucsia hover:text-k-fucsia transition-colors"
                >
                  {col.title}
                </Link>
              ))}
            </div>
          )}

          <ProductGrid products={favoritos.items} />

          <div className="text-center mt-14">
            <Link
              href="/tienda"
              className="inline-block bg-k-fucsia text-white px-10 py-4 rounded-full font-semibold uppercase tracking-[0.12em] text-xs hover:bg-k-fucsia-dark transition-colors"
            >
              Ver toda la tienda
            </Link>
          </div>
        </Revelar>
        </div>
      </section>

      {/* ---- TESTIMONIOS ---- */}
      <Revelar>
        <Testimonios />
      </Revelar>

      {/* ---- VALORES DEL MANUAL ---- */}
      <section className="bg-k-lila/25">
        <Revelar>
        <div className="max-w-5xl mx-auto px-5 md:px-8 py-14 md:py-20 grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
          {VALORES.map((v) => (
            <div key={v.titulo}>
              <Flor
                className={`w-8 h-8 mx-auto mb-3 ${v.flor}`}
                variante="linea"
              />
              <h3 className="font-script text-3xl leading-none text-k-fucsia">
                {v.titulo}
              </h3>
              <p className="text-k-gris text-sm mt-2 leading-snug">{v.texto}</p>
            </div>
          ))}
        </div>
        </Revelar>
      </section>

      {/* ---- INSTAGRAM ---- */}
      <Revelar>
        <Instagram productos={products} />
      </Revelar>

      {/* ---- PREGUNTAS FRECUENTES ---- */}
      <Revelar>
        <PreguntasFrecuentes />
      </Revelar>

      {/* ---- CIERRE ---- */}
      <section className="bg-k-fucsia text-white">
        <Revelar>
        <div className="max-w-3xl mx-auto px-5 md:px-8 py-20 md:py-24 text-center">
          <Corazon className="w-9 h-9 mx-auto mb-5 text-white/70" />
          <h2 className="font-script text-[3rem] md:text-[4rem] leading-[1.18]">
            vive la moda con comodidad
          </h2>
          <p className="text-white/85 text-lg max-w-sm mx-auto mt-5 leading-relaxed">
            Escríbenos y te ayudamos a encontrar tu talla.
          </p>
          <Link
            href="/contacto"
            className="inline-block mt-9 bg-white text-k-fucsia px-10 py-4 rounded-full font-semibold uppercase tracking-[0.12em] text-xs hover:bg-k-hueso transition-colors"
          >
            Hablar con Kona
          </Link>
        </div>
        </Revelar>
      </section>
    </div>
  );
}
