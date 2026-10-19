import { testimonios } from "@/data/testimonios";
import { Estrella } from "@/components/brand/Garabatos";
import Foto from "@/components/brand/Foto";

// =============================================================
//  TESTIMONIOS
//  Mensajes reales de clientas, transcritos de los posts de Kona.
//
//  Por que NO es una rejilla de tarjetas: solo dos de los tres
//  mensajes tienen foto, y las tarjetas salian desparejas (una alta
//  con foto, otra baja sin ella). Aqui una sola foto grande sostiene
//  la seccion y las frases van apiladas, asi que da igual cuantas
//  fotos haya: siempre se ve ordenado.
//
//  La foto esta recortada para dejar fuera el globo de WhatsApp del
//  post original: ese texto ya se lee al lado, y repetido dentro de
//  la imagen solo ensuciaba.
//
//  Si un testimonio no tiene nombre, no se inventa ninguno.
// =============================================================

const FOTO_PRINCIPAL = {
  src: "/marca/testi-negro-limpio.webp", // 704 x 880
  alt: "Clienta de Kona con ropa de baño negra",
};

export default function Testimonios() {
  if (testimonios.length === 0) return null;

  return (
    <section className="bg-k-hueso">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
        <div className="grid md:grid-cols-5 gap-10 md:gap-14 items-center">
          {/* la foto, en su formato vertical */}
          <div className="md:col-span-2">
            <div className="relative aspect-[4/5] w-full max-w-[420px] mx-auto overflow-hidden rounded-[2rem]">
              <Foto
                src={FOTO_PRINCIPAL.src}
                alt={FOTO_PRINCIPAL.alt}
                sizes="(min-width: 768px) 420px, 88vw"
              />
            </div>
          </div>

          {/* las frases */}
          <div className="md:col-span-3">
            <p className="uppercase tracking-[0.45em] text-[11px] text-k-gris font-semibold mb-3">
              Nos lo cuentan ellas
            </p>
            <h2 className="font-script text-[3.2rem] md:text-6xl text-k-fucsia leading-[1.1] mb-8">
              Testimonios
            </h2>

            <div className="divide-y divide-k-gris-claro">
              {testimonios.map((t) => (
                <figure key={t.id} className="py-6 first:pt-0 last:pb-0">
                  <div
                    className="flex gap-1 text-k-fucsia mb-3"
                    aria-label="5 de 5"
                  >
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Estrella key={i} className="w-3.5 h-3.5" />
                    ))}
                  </div>

                  <blockquote className="text-k-gris-texto text-base md:text-lg leading-relaxed">
                    “{t.texto}”
                  </blockquote>

                  <figcaption className="mt-3 text-sm">
                    {/* Sin nombre real no se escribe ninguno. */}
                    <span className="font-semibold text-k-fucsia">
                      {t.nombre ?? "Clienta Kona"}
                    </span>
                    {t.prenda && (
                      <span className="text-k-gris"> · {t.prenda}</span>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
