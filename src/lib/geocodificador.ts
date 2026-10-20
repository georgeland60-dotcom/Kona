// =============================================================
//  DE UNA DIRECCIÓN ESCRITA A UN DISTRITO
//
//  La clienta escribe "Av. Larco 1234" y la tienda tiene que saber que
//  eso es Miraflores, para cobrarle S/ 10 sin hacerla buscar entre 55
//  opciones de una lista.
//
//  Por defecto usa OpenStreetMap (Nominatim): es gratis, no pide
//  tarjeta ni clave, y para distritos de Lima acierta bien. Si algún
//  día hace falta más precisión en calles, basta con poner una clave de
//  Google en las variables de entorno y se usa esa sin tocar el resto.
//
//  Reglas que se respetan por diseño:
//   - Se llama desde el SERVIDOR. Una clave en el navegador se copia.
//   - Nominatim pide no pasar de una consulta por segundo y decir quién
//     eres: las dos cosas están abajo.
//   - Lo que diga el mapa NO fija el precio. El precio sale siempre de
//     la tabla de la tienda; el mapa solo propone el distrito.
// =============================================================

const NOMINATIM =
  process.env.NOMINATIM_BASE_URL || "https://nominatim.openstreetmap.org";
const GOOGLE =
  process.env.GOOGLE_MAPS_BASE_URL || "https://places.googleapis.com/v1";

// Nominatim exige identificarse con algo que permita contactar si algo
// va mal. Se puede cambiar por el dominio real de la tienda.
const QUIEN_SOY =
  process.env.NOMINATIM_USER_AGENT || "KonaModa/1.0 (tienda online, Perú)";

export type DireccionEncontrada = {
  direccion: string; // la dirección completa, como la escribe el mapa
  // Candidatos a distrito, de lo más preciso a lo más general. Se
  // prueban en ese orden contra la tabla de envíos: en Lima el distrito
  // suele venir como "suburb"; en provincia lo que calza es la ciudad.
  candidatos: string[];
};

export function geocodificadorEnUso(): "google" | "osm" {
  return process.env.GOOGLE_MAPS_API_KEY ? "google" : "osm";
}

// ---- Una consulta por segundo, y no repetir lo ya preguntado --------

let ultimaLlamada = 0;
const cache = new Map<string, { hasta: number; datos: DireccionEncontrada[] }>();
const VIGENCIA_MS = 10 * 60 * 1000;

async function esperarTurno() {
  const falta = 1100 - (Date.now() - ultimaLlamada);
  if (falta > 0) await new Promise((listo) => setTimeout(listo, falta));
  ultimaLlamada = Date.now();
}

// ---- OpenStreetMap ---------------------------------------------------

type ResultadoOsm = {
  display_name?: string;
  address?: Record<string, string>;
};

async function buscarEnOsm(texto: string): Promise<DireccionEncontrada[]> {
  const url =
    `${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=5` +
    `&countrycodes=pe&accept-language=es&q=${encodeURIComponent(texto)}`;

  const res = await fetch(url, {
    headers: { "User-Agent": QUIEN_SOY, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];

  const datos = (await res.json()) as ResultadoOsm[];
  return datos.map((d) => {
    const a = d.address ?? {};
    // El distrito aparece en campos distintos según la zona: en Lima
    // casi siempre "suburb"; en provincia, "city" o "town".
    const candidatos = [
      a.suburb,
      a.city_district,
      a.town,
      a.village,
      a.city,
      a.county,
      a.state,
    ].filter((x): x is string => !!x);

    return {
      direccion: d.display_name ?? texto,
      candidatos: [...new Set(candidatos)],
    };
  });
}

// ---- Google (opcional, solo si hay clave) ---------------------------

async function buscarEnGoogle(texto: string): Promise<DireccionEncontrada[]> {
  const api = process.env.GOOGLE_MAPS_API_KEY;
  if (!api) return [];

  const res = await fetch(`${GOOGLE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": api,
      "X-Goog-FieldMask": "places.formattedAddress,places.addressComponents",
    },
    cache: "no-store",
    body: JSON.stringify({
      textQuery: texto,
      languageCode: "es",
      includedRegionCodes: ["pe"],
      maxResultCount: 5,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];

  const datos = (await res.json()) as {
    places?: {
      formattedAddress?: string;
      addressComponents?: { longText?: string; types?: string[] }[];
    }[];
  };

  return (datos.places ?? []).map((p) => {
    const porTipo = (tipo: string) =>
      (p.addressComponents ?? [])
        .filter((c) => c.types?.includes(tipo))
        .map((c) => c.longText ?? "")
        .filter(Boolean);

    return {
      direccion: p.formattedAddress ?? texto,
      candidatos: [
        ...new Set([
          ...porTipo("sublocality_level_1"),
          ...porTipo("locality"),
          ...porTipo("administrative_area_level_2"),
          ...porTipo("administrative_area_level_1"),
        ]),
      ],
    };
  });
}

// ---- La puerta de entrada -------------------------------------------

export async function buscarDireccion(
  texto: string
): Promise<DireccionEncontrada[]> {
  const limpio = texto.trim().slice(0, 150);
  if (limpio.length < 6) return [];

  const guardado = cache.get(limpio.toLowerCase());
  if (guardado && Date.now() < guardado.hasta) return guardado.datos;

  try {
    await esperarTurno();
    const datos =
      geocodificadorEnUso() === "google"
        ? await buscarEnGoogle(limpio)
        : await buscarEnOsm(limpio);

    cache.set(limpio.toLowerCase(), {
      hasta: Date.now() + VIGENCIA_MS,
      datos,
    });
    return datos;
  } catch {
    // Si el mapa no responde, la tienda sigue vendiendo: queda el
    // selector de distritos de siempre.
    return [];
  }
}
