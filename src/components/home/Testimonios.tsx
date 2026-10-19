import { testimonios } from "@/data/testimonios";
import { Corazon, Estrella } from "@/components/brand/Garabatos";
import Foto from "@/components/brand/Foto";
import { store } from "@/config/store";

// =============================================================
//  TESTIMONIOS CON PINTA DE INSTAGRAM
//  Cada mensaje se presenta como una publicacion: cabecera con la
//  cuenta, la foto del post y debajo el mensaje de la clienta.
//
//  Las fotos van SIN recortar, con el globo de WhatsApp del post
//  original a la vista: eso es justo lo que hace que se vea autentico
//  y no un testimonio de plantilla.
//
//  El tercer mensaje no tiene foto, y en vez de dejar una tarjeta
//  coja se muestra como una publicacion de solo texto sobre fucsia:
//  es un formato que Instagram tiene de verdad, asi que no se ve
//  como un hueco sino como algo pensado.
//
//  Si un testimonio no trae nombre, no se inventa ninguno.
// =============================================================

export default function Testimonios() {
  if (testimonios.length === 0) return null;

  return (
    <section className="bg-k-hueso">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
        <div className="text-center mb-10 md:mb-14">
          <p className="uppercase tracking-[0.45em] text-[11px] text-k-gris font-semibold mb-3">
            Nos lo cuentan ellas
          </p>
          <h2 className="font-script text-[3rem] md:text-6xl text-k-fucsia leading-[1.1]">
            Testimonios
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonios.map((t) => (
            <article
              key={t.id}
              className="bg-white rounded-[1.25rem] overflow-hidden border border-k-gris-claro flex flex-col"
            >
              {/* cabecera, como la de una publicacion */}
              <div className="flex items-center gap-2.5 px-4 py-3">
                <span className="w-7 h-7 rounded-full bg-k-fucsia grid place-items-center shrink-0">
                  <Corazon className="w-3.5 h-3.5 text-white" />
                </span>
                <span className="text-sm font-semibold text-k-gris-texto">
                  {store.instagramHandle}
                </span>
              </div>

              {/* la foto del post, o una publicacion de solo texto */}
              {t.foto ? (
                <div className="relative aspect-[4/5] placeholder-box">
                  <Foto
                    src={t.foto}
                    alt={`Publicación de Kona: ${t.prenda ?? "prenda"}`}
                    sizes="(min-width: 768px) 360px, 90vw"
                  />
                </div>
              ) : (
                <div className="aspect-[4/5] bg-k-fucsia text-white grid place-items-center px-6 text-center">
                  <div>
                    <Estrella className="w-6 h-6 mx-auto mb-4 text-white/70" />
                    <p className="font-script text-3xl leading-[1.25]">
                      “{t.texto}”
                    </p>
                  </div>
                </div>
              )}

              {/* pie: corazon, estrellas y el mensaje */}
              <div className="px-4 py-4 flex flex-col flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Corazon className="w-4 h-4 text-k-fucsia" />
                  <span className="flex gap-0.5 text-k-fucsia" aria-label="5 de 5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Estrella key={i} className="w-3 h-3" />
                    ))}
                  </span>
                </div>

                {/* En la de solo texto el mensaje ya se leyo arriba. */}
                {t.foto && (
                  <blockquote className="text-k-gris-texto text-sm leading-relaxed flex-1">
                    “{t.texto}”
                  </blockquote>
                )}

                <p className="mt-3 text-xs">
                  {/* Sin nombre real no se escribe ninguno. */}
                  <span className="font-semibold text-k-fucsia">
                    {t.nombre ?? "Clienta Kona"}
                  </span>
                  {t.prenda && <span className="text-k-gris"> · {t.prenda}</span>}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
