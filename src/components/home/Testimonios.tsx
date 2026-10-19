import { testimonios } from "@/data/testimonios";
import { Estrella } from "@/components/brand/Garabatos";

// =============================================================
//  TESTIMONIOS
//  Mensajes reales de clientas. Si un testimonio no tiene nombre ni
//  foto, la tarjeta no inventa ninguno: simplemente no los muestra.
// =============================================================

export default function Testimonios() {
  if (testimonios.length === 0) return null;

  return (
    <section className="bg-k-hueso border-y border-k-gris-claro">
      <div className="max-w-6xl mx-auto px-4 py-16 md:py-20">
        <div className="text-center mb-10 md:mb-12">
          <p className="uppercase tracking-[0.35em] text-xs text-k-gris font-semibold mb-2">
            Nos lo cuentan ellas
          </p>
          <h2 className="font-script text-5xl md:text-6xl text-k-fucsia leading-none">
            Testimonios
          </h2>
          <p className="text-k-gris-texto text-lg md:text-xl max-w-xl mx-auto mt-4 leading-relaxed">
            Mensajes que nos escribieron nuestras clientas después de recibir su
            pedido.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonios.map((t) => (
            <figure
              key={t.id}
              className="bg-white rounded-3xl overflow-hidden flex flex-col shadow-sm border border-k-gris-claro"
            >
              {/* la foto del post, cuando la hay */}
              {t.foto && (
                <div className="relative aspect-[5/4] placeholder-box">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.foto}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover object-[center_25%]"
                  />
                </div>
              )}

              <div className="p-6 md:p-7 flex flex-col flex-1">
              <div className="flex gap-0.5 text-k-fucsia mb-4" aria-label="5 de 5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Estrella key={i} className="w-4 h-4" />
                ))}
              </div>

              <blockquote className="text-k-gris-texto text-base leading-relaxed flex-1">
                “{t.texto}”
              </blockquote>

              <figcaption className="mt-5 pt-4 border-t border-k-gris-claro flex items-center gap-3">
                <div className="min-w-0">
                  {/* Sin nombre real no se escribe ninguno. */}
                  <p className="font-semibold text-k-fucsia text-sm leading-tight">
                    {t.nombre ?? "Clienta Kona"}
                  </p>
                  {t.prenda && (
                    <p className="text-k-gris text-xs leading-tight mt-0.5">
                      Compró: {t.prenda}
                    </p>
                  )}
                </div>
              </figcaption>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
