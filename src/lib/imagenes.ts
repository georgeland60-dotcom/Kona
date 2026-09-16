// =============================================================
//  FOTOS DE PRODUCTO
//
//  Las fotos que llegan por Telegram hay que guardarlas en algún sitio:
//  en Vercel el disco es de solo lectura, así que no se pueden escribir
//  en /public como haría una tienda normal.
//
//  Se guardan en la misma base que el resto (Upstash), y se sirven por
//  /api/imagen/<id> con caché eterna: la foto de un producto no cambia,
//  así que el CDN la guarda y la base se consulta una sola vez. Nada que
//  contratar ni configurar aparte.
//
//  Si algún día son muchas, el sitio donde se guardan se cambia aquí y
//  el resto del código ni se entera.
// =============================================================

import crypto from "crypto";
import { readDoc, writeDoc } from "@/lib/kv";

// Telegram ya comprime las fotos, pero por si acaso: una foto de
// producto por encima de esto es un error, no una foto.
const MAXIMO_BYTES = 4 * 1024 * 1024;

type ImagenGuardada = {
  mime: string;
  datos: string; // base64
  creadaEn: string;
};

const TIPOS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Guarda una foto y devuelve la dirección con la que se muestra.
// Devuelve null si no se pudo guardar: es mejor un producto sin foto que
// un producto con una foto rota.
export async function guardarImagen(
  bytes: Buffer,
  mime: string
): Promise<string | null> {
  if (bytes.byteLength === 0 || bytes.byteLength > MAXIMO_BYTES) return null;
  const tipo = TIPOS[mime] ? mime : "image/jpeg";

  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const guardado = await writeDoc<ImagenGuardada>(`imagen-${id}`, {
    mime: tipo,
    datos: bytes.toString("base64"),
    creadaEn: new Date().toISOString(),
  });

  return guardado ? `/api/imagen/${id}` : null;
}

export async function leerImagen(
  id: string
): Promise<{ bytes: Buffer; mime: string } | null> {
  // Solo caracteres de id: el id viaja en la URL y no queremos que se
  // pueda pedir cualquier otro documento de la base con un "../".
  if (!/^[a-f0-9]{8,32}$/i.test(id)) return null;

  const guardada = await readDoc<ImagenGuardada | null>(
    `imagen-${id}`,
    () => null
  );
  if (!guardada?.datos) return null;

  return {
    bytes: Buffer.from(guardada.datos, "base64"),
    mime: guardada.mime || "image/jpeg",
  };
}
