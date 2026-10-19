import { preguntas } from "@/data/faq";

// =============================================================
//  PREGUNTAS FRECUENTES
//  Usa <details>/<summary> del navegador en vez de JavaScript: se
//  abre y cierra solo, funciona con teclado y con lector de pantalla,
//  y no agrega ni un kilobyte al celular de la clienta.
// =============================================================

export default function PreguntasFrecuentes() {
  if (preguntas.length === 0) return null;

  return (
    <section className="bg-white">
      <div className="max-w-3xl mx-auto px-4 py-16 md:py-20">
        <div className="text-center mb-10">
          <p className="uppercase tracking-[0.35em] text-xs text-k-gris font-semibold mb-2">
            Resolvemos tus dudas
          </p>
          <h2 className="font-script text-5xl md:text-6xl text-k-fucsia leading-none">
            Preguntas frecuentes
          </h2>
        </div>

        <div className="divide-y divide-k-gris-claro border-y border-k-gris-claro">
          {preguntas.map((p) => (
            <details key={p.q} className="group py-4">
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none text-left">
                <span className="font-semibold text-base md:text-lg text-k-gris-texto group-hover:text-k-fucsia transition">
                  {p.q}
                </span>
                {/* el signo gira al abrir, sin JavaScript */}
                <span
                  aria-hidden="true"
                  className="shrink-0 w-7 h-7 rounded-full bg-k-fucsia/10 text-k-fucsia flex items-center justify-center text-lg leading-none transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="text-k-gris-texto text-base leading-relaxed mt-3 pr-11">
                {p.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
