// =============================================================
//  FOTOS EN ESPERA
//
//  La dueña manda las fotos y el texto por separado: primero suelta tres
//  fotos del producto y después escribe "agrega esta blusa a 79". Cuando
//  manda varias juntas, Telegram las entrega en mensajes distintos, así
//  que tampoco llegan como un bloque.
//
//  Por eso las fotos que llegan se guardan a nombre del chat y esperan
//  ahí. Cuando se da de alta un producto, se le enganchan.
//
//  Se guardan por poco tiempo: una foto de hace horas casi seguro es de
//  otra cosa, y colgársela al producto equivocado sería peor que no
//  tener foto.
// =============================================================

import { readDoc, writeDoc } from "@/lib/kv";

const VIGENCIA_MS = 2 * 60 * 60 * 1000; // 2 horas
const MAXIMO_POR_PRODUCTO = 8;

type Buzon = {
  // Direcciones de las fotos ya guardadas, en el orden en que llegaron:
  // la primera es la principal, que es la que se ve en el catálogo.
  fotos: string[];
  recibidaEn: number;
};

type Almacen = { buzones: Record<string, Buzon> };

function vacio(): Almacen {
  return { buzones: {} };
}

function limpiar(almacen: Almacen): Almacen {
  const limite = Date.now() - VIGENCIA_MS;
  const buzones: Record<string, Buzon> = {};
  for (const [chat, b] of Object.entries(almacen.buzones)) {
    if (b.recibidaEn > limite) buzones[chat] = b;
  }
  return { buzones };
}

// Guarda una foto más para ese chat. Devuelve cuántas lleva.
export async function anotarFoto(chatId: number, url: string): Promise<number> {
  const almacen = limpiar(await readDoc<Almacen>("agente-fotos", vacio));
  const clave = String(chatId);
  const previas = almacen.buzones[clave]?.fotos ?? [];

  const fotos = [...previas, url].slice(0, MAXIMO_POR_PRODUCTO);
  almacen.buzones[clave] = { fotos, recibidaEn: Date.now() };

  await writeDoc("agente-fotos", almacen);
  return fotos.length;
}

// Qué fotos hay esperando, sin gastarlas: si la dueña cancela el plan,
// tienen que seguir ahí para el siguiente intento.
export async function verFotos(chatId: number): Promise<string[]> {
  const almacen = limpiar(await readDoc<Almacen>("agente-fotos", vacio));
  return almacen.buzones[String(chatId)]?.fotos ?? [];
}

// Se llama cuando las fotos ya quedaron puestas en un producto.
export async function vaciarFotos(chatId: number): Promise<void> {
  const almacen = limpiar(await readDoc<Almacen>("agente-fotos", vacio));
  delete almacen.buzones[String(chatId)];
  await writeDoc("agente-fotos", almacen);
}
