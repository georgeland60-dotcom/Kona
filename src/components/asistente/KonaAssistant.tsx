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
    "¡Hola! Soy Kona Assistant 👋 Estoy para que elijas tranquila: dime para qué ocasión buscas y te muestro opciones. Cuando elijas una prenda, te cuento qué talla está usando la modelo y las medidas, para que pidas segura.",
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

  const [aviso, setAviso] = useState(false);

  // Cada mensaje nuevo deja la conversación abajo, como cualquier chat.
  useEffect(() => {
    if (abierto) finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, abierto, pensando]);

  // Otras partes de la tienda pueden llamarlo (por ejemplo el botón de
  // "no sé mi talla" de la ficha). Se avisa por un evento del navegador
  // para no tener que pasar nada de mano en mano por media aplicación.
  useEffect(() => {
    const abrir = () => {
      setAbierto(true);
      setAviso(false);
    };
    window.addEventListener("kona-asistente:abrir", abrir);
    return () => window.removeEventListener("kona-asistente:abrir", abrir);
  }, []);

  // Un aviso corto la primera vez que alguien se queda un rato en la
  // tienda: si no, la burbuja pasa desapercibida y nadie descubre que
  // puede preguntar. Solo una vez por visita, y se puede cerrar.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem("kona-asistente-visto")) return;
    } catch {
      return;
    }
    const t = setTimeout(() => {
      setAviso(true);
      try {
        sessionStorage.setItem("kona-asistente-visto", "1");
      } catch {
        // Modo incógnito: da igual, solo significa que se verá otra vez.
      }
    }, 5000);
    return () => clearTimeout(t);
  }, []);

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
      {/* Globo de aviso: aparece una vez y llama la atención sin tapar
          nada. Se cierra solo al abrir el asistente. */}
      {aviso && !abierto && (
        <div className="fixed bottom-24 right-5 z-40 max-w-[16rem] animate-[fadeIn_.3s_ease-out]">
          <button
            onClick={() => {
              setAbierto(true);
              setAviso(false);
            }}
            className="text-left bg-background border border-accent/30 shadow-xl rounded-2xl rounded-br-sm px-4 py-3"
          >
            <p className="text-sm font-medium">
              ¿Te ayudamos a sentirte más segura con tu talla? 💛
            </p>
            <p className="text-xs text-muted mt-0.5">
              Te contamos qué talla está usando la modelo y las medidas de
              la prenda.
            </p>
          </button>
          <button
            onClick={() => setAviso(false)}
            aria-label="Cerrar aviso"
            className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-foreground text-background text-xs leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Burbuja */}
      {/* Se ve por tamaño y por contraste, no por movimiento: un
          parpadeo constante cansa y le da aire de anuncio. */}
      <button
        onClick={() => {
          setAbierto((v) => !v);
          setAviso(false);
        }}
        aria-label={abierto ? "Cerrar el asistente" : "Abrir Kona Assistant"}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-3 rounded-full bg-accent text-white shadow-xl ring-1 ring-white/25 px-6 py-4 hover:bg-accent-dark transition-transform hover:scale-[1.03]"
      >
        {abierto ? (
          <span className="text-2xl leading-none px-2">×</span>
        ) : (
          <>
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/15">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 11.5a8.5 8.5 0 0 1-12.2 7.6L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5z" />
              </svg>
            </span>
            <span className="text-left leading-tight">
              <span className="block text-[15px] font-medium tracking-wide">
                Kona Assistant
              </span>
              <span className="block text-[11px] text-white/80">
                Te ayudamos con tu talla
              </span>
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
