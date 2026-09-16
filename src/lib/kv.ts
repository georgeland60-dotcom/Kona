// =============================================================
//  ALMACENAMIENTO DE DATOS (JSON con dos "cajones")
//
//  La tienda guarda su estado (productos, precios, descuentos) en
//  documentos JSON. Este archivo decide DÓNDE se guardan:
//
//   1. Si hay una base KV configurada (Upstash / Vercel KV), se usa esa.
//      Es lo que hace falta en producción: el disco de Vercel es de
//      SOLO LECTURA, así que sin KV los cambios se pierden al recargar.
//
//   2. Si no hay KV, se usa el disco local (carpeta data/). Perfecto
//      para desarrollo en la laptop, sin instalar nada.
//
//  Ambas opciones son gratuitas. Ver AGENTE.md para configurarlo.
// =============================================================

import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

// Credenciales de la base KV. Aceptamos los dos nombres habituales:
// los que pone Vercel (KV_REST_API_*) y los de Upstash directo.
function kvCreds(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

// ¿Estamos guardando en una base real (persistente)?
export function isPersistent(): boolean {
  return kvCreds() !== null;
}

// Manda un comando a Upstash por su API REST (formato ["SET", clave, valor]).
async function kvCommand(cmd: unknown[]): Promise<unknown> {
  const creds = kvCreds();
  if (!creds) throw new Error("KV no configurado");
  const res = await fetch(creds.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`KV respondió ${res.status}`);
  }
  const data = (await res.json()) as { result?: unknown; error?: string };
  if (data.error) throw new Error(`KV: ${data.error}`);
  return data.result;
}

// ---- API pública -----------------------------------------------------

// Lee un documento JSON. Si no existe (o falla la lectura), devuelve
// el valor "de fábrica" que produce la función fallback.
export async function readDoc<T>(key: string, fallback: () => T): Promise<T> {
  if (isPersistent()) {
    try {
      const raw = await kvCommand(["GET", `kona:${key}`]);
      if (typeof raw === "string" && raw.length > 0) {
        return JSON.parse(raw) as T;
      }
    } catch {
      // Si la base falla, seguimos con los datos de fábrica para que la
      // tienda nunca se caiga por un problema de red.
    }
    return fallback();
  }

  try {
    const raw = await fs.readFile(path.join(DATA_DIR, `${key}.json`), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback();
  }
}

// ---- Candado ---------------------------------------------------------
//
//  Para lo que NO puede pasar dos veces a la vez: descontar stock.
//  Sin esto, dos compras simultáneas de la última unidad leen "queda 1"
//  las dos, las dos restan, y se vende algo que no existe. El síntoma
//  aparece al despachar, cuando ya no hay nada que hacer.
//
//  Es un candado sencillo (SET NX con caducidad): sirve porque el único
//  que escribe es esta misma aplicación y las secciones que protege
//  duran milisegundos. Si el proceso se muere con el candado puesto, la
//  caducidad lo suelta sola.

const CANDADO_MS = 10_000;

// Cola local, para cuando no hay base KV (desarrollo en la laptop, o un
// servidor único). Encadena los trabajos del mismo nombre para que no se
// pisen dentro de este proceso. No sustituye al candado de la base: en
// producción hay varias máquinas y cada una tiene su cola.
const colas = new Map<string, Promise<unknown>>();

function enCola<T>(nombre: string, trabajo: () => Promise<T>): Promise<T> {
  const anterior = colas.get(nombre) ?? Promise.resolve();
  const turno = anterior.then(trabajo, trabajo);
  // La cola sigue aunque un trabajo falle: un error no puede atascar la
  // tienda entera.
  colas.set(
    nombre,
    turno.catch(() => undefined)
  );
  return turno;
}

export async function conCandado<T>(
  nombre: string,
  trabajo: () => Promise<T>
): Promise<T> {
  if (!isPersistent()) return enCola(nombre, trabajo);

  const clave = `kona:candado:${nombre}`;
  const intervalos = [0, 60, 120, 240, 480, 900, 1500];

  for (const espera of intervalos) {
    if (espera > 0) await new Promise((listo) => setTimeout(listo, espera));
    let puesto = false;
    try {
      const res = await kvCommand([
        "SET",
        clave,
        String(Date.now()),
        "NX",
        "PX",
        String(CANDADO_MS),
      ]);
      puesto = res === "OK";
    } catch {
      // Si la base falla, es mejor seguir que dejar la tienda sin vender.
      return enCola(nombre, trabajo);
    }

    if (!puesto) continue;

    try {
      return await trabajo();
    } finally {
      try {
        await kvCommand(["DEL", clave]);
      } catch {
        // Da igual: caduca solo.
      }
    }
  }

  // Alguien lo tiene tomado demasiado tiempo. Seguir sin candado es peor
  // que fallar: es justo el caso que se quería evitar.
  throw new Error("No se pudo tomar el candado de stock");
}

// ---- Listas ----------------------------------------------------------
//
//  Para cosas que LLEGAN DE A VARIAS Y A LA VEZ, como las fotos de un
//  producto: si cada una se guardara leyendo el documento entero y
//  volviéndolo a escribir, dos que lleguen juntas se pisan y una se
//  pierde. Con una lista el añadido es atómico y eso no puede pasar.

export async function listaAgregar(
  key: string,
  valor: string,
  vigenciaSegundos: number
): Promise<number> {
  if (isPersistent()) {
    const total = (await kvCommand(["RPUSH", `kona:${key}`, valor])) as number;
    // Que se limpie sola: una foto de hace horas no es de este producto.
    try {
      await kvCommand(["EXPIRE", `kona:${key}`, String(vigenciaSegundos)]);
    } catch {
      // Si no se pudo poner la caducidad, se limpia al usarse.
    }
    return typeof total === "number" ? total : 1;
  }

  const actual = await listaLeer(key);
  const nueva = [...actual, valor];
  await writeDoc(`lista-${key}`, { valores: nueva, guardadaEn: Date.now() });
  return nueva.length;
}

export async function listaLeer(key: string): Promise<string[]> {
  if (isPersistent()) {
    try {
      const valores = await kvCommand(["LRANGE", `kona:${key}`, "0", "-1"]);
      return Array.isArray(valores) ? (valores as string[]) : [];
    } catch {
      return [];
    }
  }

  const doc = await readDoc<{ valores?: string[] } | null>(
    `lista-${key}`,
    () => null
  );
  return doc?.valores ?? [];
}

export async function listaBorrar(key: string): Promise<void> {
  if (isPersistent()) {
    try {
      await kvCommand(["DEL", `kona:${key}`]);
    } catch {
      // Si no se pudo borrar, caduca sola por el EXPIRE.
    }
    return;
  }
  await writeDoc(`lista-${key}`, { valores: [], guardadaEn: Date.now() });
}

// Guarda un documento JSON. Devuelve true si realmente quedó guardado.
// Devuelve false cuando el disco es de solo lectura y no hay KV: así
// quien llama puede avisar en vez de fingir que se guardó.
export async function writeDoc<T>(key: string, value: T): Promise<boolean> {
  if (isPersistent()) {
    try {
      await kvCommand(["SET", `kona:${key}`, JSON.stringify(value)]);
      return true;
    } catch {
      return false;
    }
  }

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      path.join(DATA_DIR, `${key}.json`),
      JSON.stringify(value, null, 2),
      "utf8"
    );
    return true;
  } catch {
    // Disco de solo lectura (Vercel) y sin KV configurado.
    return false;
  }
}
