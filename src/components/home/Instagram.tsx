import { store } from "@/config/store";
import { Corazon } from "@/components/brand/Garabatos";
import type { Product } from "@/lib/types";

// =============================================================
//  INSTAGRAM
//  Muestra fotos reales del catalogo de Kona y lleva a la cuenta
//  verdadera (@konamoda.pe).
//
//  No simula un feed en vivo: traer las publicaciones de Instagram
//  de verdad necesita un permiso de Meta que todavia no tenemos, y
//  fingirlo seria enseñar fotos que no son las que estan publicadas.
//  Cuando quieras fotos concretas del feed, se pasan por "fotos".
// =============================================================

export default function Instagram({
  productos,
  fotos,
}: {
  productos: Product[];
  fotos?: string[]; // rutas propias, si quieres elegirlas a mano
}) {
  const imagenes =
    fotos ??
    productos
      .filter((p) => p.image)
      .slice(0, 6)
      .map((p) => p.image as string);

  if (imagenes.length === 0) return null;

  return (
    <section className="bg-white">
      <div className="max-w-6xl mx-auto px-4 py-16 md:py-20">
        <div className="text-center mb-8 md:mb-10">
          <p className="uppercase tracking-[0.35em] text-xs text-k-gris font-semibold mb-2">
            Síguenos
          </p>
          <h2 className="font-script text-5xl md:text-6xl text-k-fucsia leading-none">
            {store.instagramHandle}
          </h2>
          <p className="text-k-gris-texto text-lg md:text-xl max-w-xl mx-auto mt-4 leading-relaxed">
            Mira cómo se ven nuestras prendas en mujeres reales, todos los días.
          </p>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5 md:gap-3">
          {imagenes.map((src, i) => (
            <a
              key={i}
              href={store.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square overflow-hidden rounded-2xl placeholder-box"
              aria-label={`Ver Kona en Instagram (${store.instagramHandle})`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
              <span className="absolute inset-0 bg-k-fucsia/0 group-hover:bg-k-fucsia/35 transition flex items-center justify-center">
                <Corazon className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition" />
              </span>
            </a>
          ))}
        </div>

        <div className="text-center mt-8">
          <a
            href={store.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block border-2 border-k-fucsia text-k-fucsia px-8 py-3.5 rounded-full font-bold uppercase tracking-wide text-sm hover:bg-k-fucsia hover:text-white transition"
          >
            Seguir a {store.instagramHandle}
          </a>
        </div>
      </div>
    </section>
  );
}
