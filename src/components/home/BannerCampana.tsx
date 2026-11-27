import Link from "next/link";
import { getImageProps } from "next/image";
import type { Campana } from "@/data/campana";

// =============================================================
//  BANNER DE CAMPAÑA
//  Una imagen distinta para celular y para escritorio ("art
//  direction"): la de escritorio es apaisada (1920x940) y la de
//  celular vertical (1080x1350). Recortar una sola para las dos
//  pantallas cortaba el texto dibujado.
//
//  Se arma con getImageProps + <picture>, como manda la documentación
//  de Next 16. Sin preload ni carga inmediata: eso bajaría LAS DOS
//  imágenes; fetchPriority="high" prioriza solo la que toca.
//
//  Todo el banner es un enlace: el botón "Comprar ahora" está dibujado
//  dentro de la imagen y, si no, no se podría tocar.
// =============================================================

export default function BannerCampana({ campana }: { campana: Campana }) {
  const comun = {
    alt: campana.alt,
    sizes: "100vw",
    quality: 88,
    fetchPriority: "high" as const,
  };

  const {
    props: { srcSet: escritorio },
  } = getImageProps({
    ...comun,
    src: campana.escritorio.src,
    width: campana.escritorio.ancho,
    height: campana.escritorio.alto,
  });

  const {
    props: { srcSet: celular, ...img },
  } = getImageProps({
    ...comun,
    src: campana.celular.src,
    width: campana.celular.ancho,
    height: campana.celular.alto,
  });

  return (
    <section aria-label={campana.nombre}>
      <Link
        href={campana.href}
        className="block focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-k-fucsia"
      >
        <picture>
          <source media="(min-width: 768px)" srcSet={escritorio} />
          <source srcSet={celular} />
          {/* El alto lo fija la proporción de cada imagen, así la página
              no salta mientras carga. */}
          <img
            {...img}
            alt={campana.alt}
            className="block w-full h-auto aspect-[1080/1350] md:aspect-[1920/940] object-cover"
          />
        </picture>
      </Link>
    </section>
  );
}
