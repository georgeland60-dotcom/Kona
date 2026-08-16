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
