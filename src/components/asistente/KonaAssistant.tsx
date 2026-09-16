"use client";

// =============================================================
//  KONA ASSISTANT — el que atiende a quien entra a comprar
//
//  Va como burbuja abajo a la derecha, presente en toda la tienda pero
//  sin estorbar: quien viene a comprar directo ni lo abre, y quien no
//  sabe qué llevar lo tiene a mano. Se abre en un panel, no en una
//  página aparte, para no sacar a nadie de lo que estaba mirando.
// =============================================================

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { store } from "@/config/store";

type Sugerencia = {
  slug: string;
  nombre: string;
  precio: number;
  precioAnterior?: number;
  imagen?: string;
  tallas: string[];
};

type Mensaje = {
  rol: "cliente" | "asistente";
  texto: string;
  productos?: Sugerencia[];
};

const SALUDO: Mensaje = {
  rol: "asistente",
  texto:
    "¡Hola! Soy el asistente de Kona 👋 Dime para qué ocasión buscas y te muestro opciones. Cuando elijas una prenda, te paso sus medidas y la talla de la modelo para que vayas segura.",
};

// Atajos distintos según dónde esté: en una ficha lo que se pregunta es
// por esa prenda; en el resto de la tienda, qué llevar.
const ATAJOS_TIENDA = [
  "Algo para una ocasión especial",
  "Algo cómodo para diario",
  "Lo más nuevo",
];

const ATAJOS_PRODUCTO = [
  "¿Qué talla me conviene?",
  "¿Qué talla usa la modelo?",
  "¿De qué tela es?",
];

export default function KonaAssistant() {
  const ruta = usePathname();
  // Si está en una ficha, el asistente ya sabe de qué prenda se habla:
  // no hace falta que ella lo escriba ni que él lo adivine.
  const productoDeLaRuta = ruta?.startsWith("/producto/")
    ? ruta.replace("/producto/", "").split("/")[0]
    : undefined;

  const [abierto, setAbierto] = useState(false);
  // La prenda de la que se está hablando: la de la ficha, o la que ella
  // elija de las recomendadas.
  const [elegida, setElegida] = useState<string | undefined>(undefined);
  const [mensajes, setMensajes] = useState<Mensaje[]>([SALUDO]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  // Cada mensaje nuevo deja la conversación abajo, como cualquier chat.
  useEffect(() => {
    if (abierto) finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, abierto, pensando]);

  const preguntar = async (pregunta: string, sobre?: string) => {
    const limpio = pregunta.trim();
    if (!limpio || pensando) return;

    const producto = sobre ?? elegida ?? productoDeLaRuta;
    if (sobre) setElegida(sobre);

    const conmigo: Mensaje[] = [...mensajes, { rol: "cliente", texto: limpio }];
    setMensajes(conmigo);
    setTexto("");
    setPensando(true);

    try {
      const res = await fetch("/api/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensajes: conmigo.map((m) => ({ rol: m.rol, texto: m.texto })),
          producto,
        }),
      });
      const data = await res.json();
      setMensajes((prev) => [
        ...prev,
        {
          rol: "asistente",
          texto: data.respuesta ?? "No pude responder ahora mismo.",
          productos: data.productos ?? [],
        },
      ]);
    } catch {
      setMensajes((prev) => [
        ...prev,
        {
          rol: "asistente",
          texto:
            "Se cortó la conexión. Vuelve a intentar, o escríbenos por WhatsApp.",
        },
      ]);
    } finally {
      setPensando(false);
    }
  };

  return (
    <>
      {/* Burbuja */}
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-label={abierto ? "Cerrar el asistente" : "Abrir el asistente"}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-accent text-white shadow-lg px-4 py-3 hover:bg-accent-dark transition"
      >
        {abierto ? (
          <span className="text-lg leading-none">×</span>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 11.5a8.5 8.5 0 0 1-12.2 7.6L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5z" />
            </svg>
            <span className="text-sm font-medium hidden sm:inline">
              ¿Te ayudo a elegir?
            </span>
          </>
        )}
      </button>

      {/* Panel */}
      {abierto && (
        <div className="fixed bottom-20 right-3 left-3 sm:left-auto sm:right-5 sm:w-[380px] z-40 bg-background border border-line rounded-2xl shadow-2xl flex flex-col max-h-[70vh] overflow-hidden">
          <div className="px-4 py-3 border-b border-line">
            <p className="font-medium text-sm">Kona Assistant</p>
            <p className="text-xs text-muted">
              Te ayudo a elegir prenda y talla
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {mensajes.map((m, i) => (
              <div key={i}>
                <div
                  className={`text-sm leading-relaxed whitespace-pre-line ${
                    m.rol === "cliente"
                      ? "bg-soft rounded-2xl rounded-br-sm px-3 py-2 ml-8"
                      : "text-foreground"
                  }`}
                >
                  {m.texto}
                </div>

                {m.productos && m.productos.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {m.productos.map((p) => (
                      <div
                        key={p.slug}
                        className="border border-line rounded-xl p-2 hover:border-foreground transition"
                      >
                      <Link
                        href={`/producto/${p.slug}`}
                        onClick={() => setAbierto(false)}
                        className="flex gap-3 items-center"
                      >
                        <div className="w-12 h-16 placeholder-box rounded-lg overflow-hidden flex-shrink-0">
                          {p.imagen ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.imagen}
                              alt={p.nombre}
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {p.nombre}
                          </p>
                          <p className="text-sm">
                            <span className="text-accent">
                              {formatPrice(p.precio)}
                            </span>
                            {p.precioAnterior && (
                              <span className="text-xs text-muted line-through ml-2">
                                {formatPrice(p.precioAnterior)}
                              </span>
                            )}
                          </p>
                          {p.tallas.length > 0 && (
                            <p className="text-[11px] text-muted">
                              Tallas {p.tallas.join(" · ")}
                            </p>
                          )}
                        </div>
                      </Link>
                      {/* El paso natural después de elegir: la talla. Al
                          tocarlo, el asistente ya sabe de qué prenda se
                          habla y saca su guía. */}
                      <button
                        onClick={() =>
                          preguntar(
                            `Me gusta ${p.nombre}, ¿qué talla me conviene?`,
                            p.slug
                          )
                        }
                        className="mt-2 w-full text-xs border border-line rounded-full py-1.5 hover:border-foreground transition"
                      >
                        Ayúdame con la talla
                      </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Atajos, solo al principio: después estorban. */}
            {mensajes.length === 1 && !pensando && (
              <div className="flex flex-wrap gap-2 pt-1">
                {(productoDeLaRuta ? ATAJOS_PRODUCTO : ATAJOS_TIENDA).map((a) => (
                  <button
                    key={a}
                    onClick={() => preguntar(a)}
                    className="text-xs border border-line rounded-full px-3 py-1.5 hover:border-foreground transition"
                  >
                    {a}
                  </button>
                ))}
              </div>
            )}

            {pensando && (
              <p className="text-sm text-muted">Pensando…</p>
            )}
            <div ref={finRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              preguntar(texto);
            }}
            className="p-3 border-t border-line flex gap-2"
          >
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={500}
              placeholder="Escribe lo que buscas…"
              className="flex-1 border border-line rounded-full px-4 py-2 text-sm focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={pensando || !texto.trim()}
              className="bg-foreground text-background rounded-full px-4 text-sm disabled:opacity-40"
            >
              Enviar
            </button>
          </form>

          <p className="px-4 pb-3 text-[11px] text-muted">
            ¿Prefieres hablar con una persona?{" "}
            <a
              href={`https://wa.me/${store.whatsapp}`}
              target="_blank"
              className="underline"
            >
              Escríbenos por WhatsApp
            </a>
            .
          </p>
        </div>
      )}
    </>
  );
}
