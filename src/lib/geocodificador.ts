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
  // Cómo llamar a la zona cuando NINGÚN candidato está en la tabla. Es
  // el distrito, no el barrio: decirle "Las Virreinas" a quien vive en
  // Lurín no le dice nada, y encima salían tres opciones iguales.
  zona?: string;
  // Dónde cae en el mapa, para poder enseñárselo y que confirme. Una
  // dirección escrita se lee de mil formas; un punto en el mapa, no.
  lat?: number;
  lon?: number;
  // ¿El punto es el portal (trae el número) o solo la calle? Nominatim
  // devuelve la calle entera aunque se le pida "Av. X 1632", y llamar
  // a eso "exacta" hacía que la clienta confiara en un punto que podía
  // estar a quince cuadras de su casa.
  conNumero?: boolean;
  // Solo los nombres de barrio y distrito, sin la ciudad ni la región:
  // para comparar con el distrito que eligió la clienta. "Lima" sale
  // como ciudad en TODA la capital, y compararlo daría por bueno un
  // punto en Miraflores para quien vive en el Cercado.
  finos?: string[];
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
  lat?: string;
  lon?: string;
};

// Un rectángulo en el mapa: oeste, norte, este, sur.
export type Caja = [number, number, number, number];

// Lima Metropolitana y el Callao, de Ancón a Pucusana y de la costa a
// Chosica. Con "Lima y Callao" elegido, nada fuera de aquí vale: así
// "Surco" no puede volver a caer en el Surco de Huarochirí.
export const CAJA_LIMA_Y_CALLAO: Caja = [-77.25, -11.55, -76.6, -12.55];

async function buscarEnOsm(
  texto: string,
  caja?: Caja
): Promise<DireccionEncontrada[]> {
  const url =
    `${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=5` +
    `&countrycodes=pe&accept-language=es&q=${encodeURIComponent(texto)}` +
    (caja ? `&viewbox=${caja.join(",")}&bounded=1` : "");

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
    // De lo más fino a lo más grueso. Los dos primeros parecían de más
    // y resultaron ser justo donde OpenStreetMap mete el distrito en el
    // centro de Lima ("Urbanización Cercado de Lima" viene como barrio,
    // no como suburb), así que sin ellos esas direcciones se quedaban
    // sin precio.
    const candidatos = [
      a.neighbourhood,
      a.quarter,
      a.residential,
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
      zona: a.city_district || a.town || a.village || a.city || a.county,
      lat: d.lat ? Number(d.lat) : undefined,
      lon: d.lon ? Number(d.lon) : undefined,
      conNumero: !!a.house_number,
      finos: [
        a.neighbourhood,
        a.quarter,
        a.residential,
        a.suburb,
        a.city_district,
        a.town,
        a.village,
        // En Lima el distrito viene como "city" (Miraflores, Santiago
        // de Surco...) y el Cercado, como "Lima". La región ("state")
        // también se llama Lima, y por eso se deja fuera.
        a.city,
      ].filter((x): x is string => !!x),
    };
  });
}

// ---- Google (opcional, solo si hay clave) ---------------------------

async function buscarEnGoogle(
  texto: string,
  caja?: Caja
): Promise<DireccionEncontrada[]> {
  const api = process.env.GOOGLE_MAPS_API_KEY;
  if (!api) return [];

  const res = await fetch(`${GOOGLE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": api,
      // Sin "places.location" Google contesta la dirección pero NO el
      // punto, y sin punto el mapa no sale nunca: con clave puesta, la
      // búsqueda habría fallado siempre sin que nadie lo notara.
      "X-Goog-FieldMask":
        "places.formattedAddress,places.addressComponents,places.location,places.types",
    },
    cache: "no-store",
    body: JSON.stringify({
      textQuery: texto,
      languageCode: "es",
      includedRegionCodes: ["pe"],
      maxResultCount: 5,
      ...(caja && {
        locationRestriction: {
          rectangle: {
            low: { latitude: caja[3], longitude: caja[0] },
            high: { latitude: caja[1], longitude: caja[2] },
          },
        },
      }),
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];

  const datos = (await res.json()) as {
    places?: {
      formattedAddress?: string;
      addressComponents?: { longText?: string; types?: string[] }[];
      location?: { latitude?: number; longitude?: number };
      types?: string[];
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
      zona: porTipo("locality")[0] ?? porTipo("administrative_area_level_2")[0],
      candidatos: [
        ...new Set([
          ...porTipo("sublocality_level_1"),
          ...porTipo("locality"),
          ...porTipo("administrative_area_level_2"),
          ...porTipo("administrative_area_level_1"),
        ]),
      ],
      lat: p.location?.latitude,
      lon: p.location?.longitude,
      conNumero: porTipo("street_number").length > 0,
      finos: [...porTipo("sublocality_level_1"), ...porTipo("locality")],
    };
  });
}

// ---- La puerta de entrada -------------------------------------------

// Qué tan fino se pudo ubicar. Importa decirlo: no es lo mismo marcar
// el portal que marcar el distrito entero.
export type Precision = "exacta" | "calle" | "zona";

// La dirección sin el número ni los añadidos de portal. En Perú media
// ciudad vive en calles que SÍ están mapeadas pero cuyos números NO:
// "Río Oxapampa 583" no devuelve nada y "Río Oxapampa" devuelve la
// calle entera. Buscar la calle es infinitamente mejor que no mostrar
// nada.
// "Av.", "Jr.", "Calle"... Son las que la gente escribe y el mapa no
// siempre reconoce: OpenStreetMap encuentra "Río Oxapampa" pero no
// "Jr. Río Oxapampa".
const TIPO_DE_VIA =
  /^(av|avda|avenida|jr|jiron|jirón|ca|calle|pasaje|psje|psj|prolongación|prolongacion)\.?$/i;

export function sinTipoDeVia(calle: string): string {
  const palabras = calle.trim().split(/\s+/);
  return palabras.length > 1 && TIPO_DE_VIA.test(palabras[0])
    ? palabras.slice(1).join(" ")
    : calle.trim();
}

export function soloLaCalle(direccion: string): string {
  const base = direccion
    // Lo que va después de una coma suele ser el detalle del portal.
    .split(",")[0]
    // Manzana, lote, departamento, interior, piso, oficina...
    .replace(
      /\b(mz|mza|manzana|lt|lote|dpto|depto|departamento|int|interior|piso|of|oficina)\b\.?\s*[\w-]*/gi,
      " "
    )
    .replace(/[#°]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  const sinNumero = base.replace(/\s+\d{1,5}\s*$/, "").trim();

  // Ojo: hay calles que SE LLAMAN con un número ("Calle 3"). Si al
  // quitar el número no queda nombre —solo "Calle" o "Jr."— es que ese
  // número era el nombre, no la puerta, y hay que dejarlo.
  const TIPO = TIPO_DE_VIA;
  const quedaNombre = sinNumero
    .split(" ")
    .filter((palabra) => palabra && !TIPO.test(palabra)).length;

  return quedaNombre > 0 ? sinNumero : base;
}

// Busca de lo más preciso a lo más general y se queda con lo primero
// que encuentre. Tres intentos como mucho: la calle con número, la
// calle sola y, si no, la zona.
// La tabla de envíos llama a algunos distritos por su nombre de calle
// ("Surco", "Lima Cercado") y el mapa por el oficial ("Santiago de
// Surco", "Lima"). Preguntarle al mapa por "Surco" hacía que no
// encontrara ni Javier Prado. Aquí, cómo los conoce el mapa.
const NOMBRE_EN_EL_MAPA: Record<string, string> = {
  "lima cercado": "Lima",
  "cercado de lima": "Lima",
  surco: "Santiago de Surco",
  magdalena: "Magdalena del Mar",
  "ate vitarte": "Ate",
  chosica: "Lurigancho",
};

export function nombreEnElMapa(distrito: string): string {
  const clave = distrito
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  return NOMBRE_EN_EL_MAPA[clave] ?? distrito;
}

export async function ubicar(datos: {
  direccion: string;
  distrito?: string;
  ciudad?: string;
  // Otros nombres del mismo distrito (los alias de la tabla de envíos),
  // para reconocerlo venga como venga en el mapa.
  otrosNombres?: string[];
  // Si se da, solo vale lo que cae dentro (la provincia elegida).
  caja?: Caja;
}): Promise<{ lugar: DireccionEncontrada; precision: Precision } | null> {
  const nombres = datos.distrito
    ? [datos.distrito, ...(datos.otrosNombres ?? [])]
    : [];
  if (datos.distrito) {
    datos = { ...datos, distrito: nombreEnElMapa(datos.distrito) };
    nombres.push(datos.distrito!);
  }
  const cola = [datos.distrito, datos.ciudad, "Perú"].filter(Boolean).join(", ");
  const calle = soloLaCalle(datos.direccion);

  const intentos: { texto: string; precision: Precision }[] = [
    { texto: `${datos.direccion}, ${cola}`, precision: "exacta" },
  ];
  // Solo si quitar el número cambia algo; si no, se ahorra la consulta.
  if (calle && calle.toLowerCase() !== datos.direccion.trim().toLowerCase()) {
    intentos.push({ texto: `${calle}, ${cola}`, precision: "calle" });
  }

  // Y la calle sin el tipo de vía delante. Parece de más y no lo es:
  // "Jr. Río Oxapampa" no devuelve nada y "Río Oxapampa" devuelve la
  // calle. Es el caso de media Lima.
  const pelada = sinTipoDeVia(calle);
  if (pelada && pelada.toLowerCase() !== calle.toLowerCase()) {
    intentos.push({ texto: `${pelada}, ${cola}`, precision: "calle" });
  }
  if (datos.distrito) {
    intentos.push({ texto: cola, precision: "zona" });
  }

  // Una calle con el mismo nombre en otro distrito es el error más
  // común: hay "Jr. Los Pinos" en media Lima. Decisión de la dueña
  // (27 nov 2026): se busca SIEMPRE dentro de la provincia y el
  // distrito que eligió la clienta. Lo que cae en otro sitio no se
  // enseña; si la calle no aparece ahí, se le dice y se le muestra su
  // distrito para que marque la casa ella misma.
  const enSuDistrito = (d: DireccionEncontrada) =>
    !nombres.length ||
    (d.finos ?? []).some((c) => nombres.some((n) => mismoNombre(c, n)));

  for (const intento of intentos) {
    const encontradas = (await buscarDireccion(intento.texto, datos.caja)).filter(
      (d) => d.lat !== undefined && d.lon !== undefined
    );
    const lugar = encontradas.find(enSuDistrito);
    if (!lugar) continue;

    // Solo es "exacta" si de verdad trae el número.
    const precision: Precision =
      intento.precision === "exacta" && !lugar.conNumero ? "calle" : intento.precision;
    return { lugar, precision };
  }
  return null;
}

function sinTildes(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(cercado de|distrito de|urbanizacion)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mismoNombre(a: string, b: string): boolean {
  const x = sinTildes(a);
  const y = sinTildes(b);
  return !!x && x === y;
}

export async function buscarDireccion(
  texto: string,
  caja?: Caja
): Promise<DireccionEncontrada[]> {
  const limpio = texto.trim().slice(0, 150);
  if (limpio.length < 6) return [];
  const clave = `${limpio.toLowerCase()}|${caja?.join(",") ?? ""}`;

  const guardado = cache.get(clave);
  if (guardado && Date.now() < guardado.hasta) return guardado.datos;

  try {
    await esperarTurno();
    const datos =
      geocodificadorEnUso() === "google"
        ? await buscarEnGoogle(limpio, caja)
        : await buscarEnOsm(limpio, caja);

    cache.set(clave, {
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

// ---- Al revés: qué dirección hay en un punto ------------------------
// Cuando la clienta usa su ubicación (o pega un enlace), se le rellenan
// provincia, distrito y calle para que no tenga que escribirlos. Lo que
// diga el mapa es una propuesta: ella lo puede corregir.

export type LoQueHayAqui = {
  calle: string; // "Los Insurgentes 790", o "" si el mapa no sabe
  // Barrio, distrito y ciudad, de lo más fino a lo más grueso.
  lugares: string[];
  // Región, departamento y provincia ("Arequipa", "La Libertad"...).
  regiones: string[];
  // ¿Está en Lima Metropolitana o en el Callao?
  enLima: boolean;
};

const cacheInversa = new Map<string, { hasta: number; datos: LoQueHayAqui | null }>();

export async function queHayAqui(lat: number, lon: number): Promise<LoQueHayAqui | null> {
  const clave = `${lat.toFixed(5)},${lon.toFixed(5)}`;
  const guardado = cacheInversa.get(clave);
  if (guardado && Date.now() < guardado.hasta) return guardado.datos;

  try {
    await esperarTurno();
    const res = await fetch(
      `${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&zoom=18` +
        `&accept-language=es&lat=${lat}&lon=${lon}`,
      {
        headers: { "User-Agent": QUIEN_SOY, Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const d = (await res.json()) as ResultadoOsm & { error?: string };
    if (d.error || !d.address) return null;
    const a = d.address;

    const calle = [a.road ?? a.pedestrian ?? a.footway ?? "", a.house_number ?? ""]
      .join(" ")
      .trim();
    const enLima =
      /lima metropolitana/i.test(a.state_district ?? "") ||
      /callao/i.test([a.state, a.region, a.city].join(" "));

    const datos: LoQueHayAqui = {
      calle,
      lugares: [
        a.neighbourhood,
        a.quarter,
        a.suburb,
        a.city_district,
        a.city,
        a.town,
        a.village,
      ].filter((x): x is string => !!x),
      regiones: [a.county, a.state_district, a.region, a.state].filter(
        (x): x is string => !!x
      ),
      enLima,
    };
    cacheInversa.set(clave, { hasta: Date.now() + VIGENCIA_MS, datos });
    return datos;
  } catch {
    return null;
  }
}

// ---- Un punto que de verdad puede ser de aquí ------------------------
// El navegador manda el pin que movió la clienta, y lo que viene del
// navegador se revisa siempre. Sin esto, un pedido podría llegar con
// "NaN" o con un punto en medio del Pacífico y romper el enlace que
// abre quien reparte. Se acepta solo lo que cae dentro de Perú.
const PERU = { minLat: -18.6, maxLat: 0.1, minLon: -81.6, maxLon: -68.5 };

export function puntoValido(
  lat: unknown,
  lon: unknown
): { lat: number; lon: number } | null {
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < PERU.minLat || lat > PERU.maxLat) return null;
  if (lon < PERU.minLon || lon > PERU.maxLon) return null;
  return { lat: Number(lat.toFixed(6)), lon: Number(lon.toFixed(6)) };
}
