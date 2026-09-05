// =============================================================
//  CONVERSACIONES A MEDIO PENSAR
//
//  Un pedido complicado puede necesitar más tiempo del que dura una
//  función en el servidor. Cuando eso pasa, el agente guarda aquí todo
//  lo que lleva pensado y se llama a sí mismo para seguir en otra
//  tanda, con el mismo mensaje de Telegram y el mismo hilo.
//
//  Las sesiones viejas se limpian solas.
// =============================================================

import crypto from "crypto";
import { readDoc, writeDoc } from "@/lib/kv";
import type { EstadoAgente } from "@/lib/agent/run";

const VIGENCIA_MS = 60 * 60 * 1000; // 1 hora

// Upstash no admite valores enormes, y una nota de voz larga pesa. Si la
// sesión no cabe, es mejor terminar con lo que haya que romperse.
const MAXIMO_BYTES = 900_000;

export type Sesion = {
  chatId: number;
  avisoId: number | null; // el mensaje "déjame ver…" que se va editando
  responderA?: number; // mensaje original, para colgar la respuesta en grupo
  enGrupo: boolean;
  quien: string;
  estado: EstadoAgente;
  creadoEn: number;
};

type Almacen = { sesiones: Record<string, Sesion> };

function vacio(): Almacen {
  return { sesiones: {} };
}

function limpiar(almacen: Almacen): Almacen {
  const limite = Date.now() - VIGENCIA_MS;
  const sesiones: Record<string, Sesion> = {};
  for (const [id, s] of Object.entries(almacen.sesiones)) {
    if (s.creadoEn > limite) sesiones[id] = s;
  }
  return { sesiones };
}

// Guarda (o actualiza) una sesión. Devuelve su código, o null si no se
// pudo guardar: en ese caso quien llama tiene que cerrar el pedido con lo
// que tenga, en vez de prometer una continuación que nunca va a llegar.
export async function guardarSesion(
  sesion: Sesion,
  codigoExistente?: string
): Promise<string | null> {
  if (JSON.stringify(sesion).length > MAXIMO_BYTES) return null;

  const almacen = limpiar(await readDoc<Almacen>("agente-sesiones", vacio));
  const codigo = codigoExistente || crypto.randomUUID().replace(/-/g, "");
  almacen.sesiones[codigo] = sesion;
  const guardado = await writeDoc("agente-sesiones", almacen);
  return guardado ? codigo : null;
}

// Recupera una sesión y la borra: cada continuación se atiende una sola
// vez, y si hace falta seguir se vuelve a guardar.
export async function tomarSesion(codigo: string): Promise<Sesion | null> {
  const almacen = limpiar(await readDoc<Almacen>("agente-sesiones", vacio));
  const sesion = almacen.sesiones[codigo];
  if (!sesion) return null;

  delete almacen.sesiones[codigo];
  await writeDoc("agente-sesiones", almacen);
  return sesion;
}
