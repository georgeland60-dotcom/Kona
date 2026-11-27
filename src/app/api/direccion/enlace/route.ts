// =============================================================
//  "ESTA ES MI UBICACIÓN" (un enlace de Google Maps o de WhatsApp)
//
//  OpenStreetMap no conoce muchas calles de Lima, ni la de la tienda.
//  Google sí, pero su buscador pide clave y tarjeta. Esto da la vuelta:
//  la clienta comparte su ubicación desde Google Maps o WhatsApp, pega
//  el enlace, y aquí se saca el punto de dentro. Gratis y exacto.
//
//  Solo se siguen enlaces de Google: si no, cualquiera podría usar la
//  tienda para visitar direcciones de internet en su nombre.
// =============================================================

import { puntoValido } from "@/lib/geocodificador";
import { huellaDe } from "@/lib/asistente/limites";
import { contar } from "@/lib/kv";

export const maxDuration = 15;

// Los sitios de Google que puede traer un enlace de ubicación.
function esDeGoogle(url: URL): boolean {
  if (url.protocol !== "https:") return false;
  const h = url.hostname.toLowerCase();
  return (
    h === "maps.app.goo.gl" ||
    h === "goo.gl" ||
    h === "g.co" ||
    h === "google.com" ||
    h === "maps.google.com" ||
    /^(www\.|maps\.)?google\.com(\.pe)?$/.test(h)
  );
}

// Las formas en que un enlace de Google lleva el punto, de la más fiable
// a la menos: "!3d…!4d…" es el pin del lugar; "@lat,lon" es el centro
// de la pantalla, que suele coincidir; "q=lat,lon" es lo que manda
// WhatsApp al compartir ubicación.
const FORMAS = [
  /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/,
  /[?&](?:q|query|ll|destination|center)=(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/,
  /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/,
  /^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/,
];

function puntoDe(texto: string) {
  const claro = (() => {
    try {
      return decodeURIComponent(texto);
    } catch {
      return texto;
    }
  })();
  for (const forma of FORMAS) {
    const m = claro.match(forma);
    if (m) {
      const p = puntoValido(Number(m[1]), Number(m[2]));
      if (p) return p;
    }
  }
  return null;
}

// Los enlaces cortos (maps.app.goo.gl/…) no traen el punto: hay que
// abrirlos y ver a dónde llevan. Se siguen a mano, hasta cinco saltos,
// y solo si cada salto sigue en Google.
async function seguir(inicio: URL): Promise<string | null> {
  let url = inicio;
  for (let salto = 0; salto < 5; salto++) {
    const res = await fetch(url, {
      redirect: "manual",
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (KonaModa)" },
      signal: AbortSignal.timeout(6000),
    });
    const destino = res.headers.get("location");
    if (!destino) return url.toString();
    const siguiente = new URL(destino, url);
    if (puntoDe(siguiente.toString())) return siguiente.toString();
    if (!esDeGoogle(siguiente)) return null;
    url = siguiente;
  }
  return url.toString();
}

// Los enlaces de un lugar traen su nombre: ".../maps/place/Jirón+Los+
// Brigadieres+790,+Santiago+de+Surco.../@...". Es el nombre de Google,
// mejor que el de OpenStreetMap (que a la calle de la tienda la llama
// "Los Insurgentes"), así que se usa para rellenar la dirección.
function nombreDe(url: string): string | null {
  const m = url.match(/\/maps\/place\/([^/@?]+)/);
  if (!m) return null;
  let nombre: string;
  try {
    nombre = decodeURIComponent(m[1].replace(/\+/g, " "));
  } catch {
    return null;
  }
  const primera = nombre.split(",")[0].trim();
  // Solo si parece una calle con número, no "Plaza Vea" ni un par de
  // coordenadas.
  return /\d/.test(primera) && /[a-záéíóúñ]{3}/i.test(primera) && primera.length <= 120
    ? primera
    : null;
}

const NO_SIRVE =
  "Ese enlace no trae una ubicación. En Google Maps toca tu casa, luego \"Compartir\" y copia el enlace; o en WhatsApp comparte tu ubicación.";

export async function POST(req: Request) {
  const cuerpo = (await req.json().catch(() => ({}))) as { enlace?: unknown };
  const texto = typeof cuerpo.enlace === "string" ? cuerpo.enlace.trim().slice(0, 600) : "";
  if (!texto) return Response.json({ punto: null, aviso: NO_SIRVE });

  // Unas coordenadas pegadas tal cual, o un enlace largo que ya las trae.
  const directo = puntoDe(texto);
  if (directo) {
    return Response.json({ punto: directo, nombre: nombreDe(texto), aviso: null });
  }

  // El enlace puede venir dentro de un texto ("Mira mi ubicación: https://…").
  const enlace = texto.match(/https:\/\/\S+/)?.[0];
  let url: URL | null = null;
  try {
    url = enlace ? new URL(enlace) : null;
  } catch {
    url = null;
  }
  if (!url || !esDeGoogle(url)) return Response.json({ punto: null, aviso: NO_SIRVE });

  // Abrir enlaces es trabajo para el servidor: con tope por persona.
  if ((await contar(`enlace-${huellaDe(req)}`, 60)) > 15) {
    return Response.json({
      punto: null,
      aviso: "Probaste muchos enlaces seguidos. Espera un momento y vuelve a intentarlo.",
    });
  }

  try {
    const final = await seguir(url);
    const punto = final ? puntoDe(final) : null;
    return Response.json({
      punto,
      nombre: punto && final ? nombreDe(final) : null,
      aviso: punto ? null : NO_SIRVE,
    });
  } catch {
    return Response.json({
      punto: null,
      aviso: "No pude abrir ese enlace. Prueba con \"Usar mi ubicación\" o mueve el pin en el mapa.",
    });
  }
}
