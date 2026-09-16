// =============================================================
//  FOTOS EN ESPERA
//
//  La dueña manda las fotos y el texto por separado: suelta tres fotos
//  del producto y después escribe "agrega esta blusa a 79". Y cuando
//  manda varias juntas, Telegram las entrega en mensajes DISTINTOS y
//  casi a la vez.
//
//  Por eso se guardan en una LISTA, no en un documento: dos fotos que
//  llegan en el mismo instante se añaden sin pisarse. Leer-modificar-
//  escribir habría perdido una de cada dos.
//
//  Caducan solas: una foto de hace horas casi seguro es de otra cosa, y
//  colgársela al producto equivocado sería peor que no tener foto.
// =============================================================

import { listaAgregar, listaBorrar, listaLeer } from "@/lib/kv";

const VIGENCIA_SEGUNDOS = 2 * 60 * 60; // 2 horas
const MAXIMO_POR_PRODUCTO = 8;

function clave(chatId: number): string {
  return `fotos-${chatId}`;
}

// Guarda una foto más para ese chat. Devuelve cuántas lleva.
export async function anotarFoto(chatId: number, url: string): Promise<number> {
  return listaAgregar(clave(chatId), url, VIGENCIA_SEGUNDOS);
}

// Qué fotos hay esperando, sin gastarlas: si la dueña cancela el plan,
// tienen que seguir ahí para el siguiente intento.
export async function verFotos(chatId: number): Promise<string[]> {
  const fotos = await listaLeer(clave(chatId));
  return fotos.slice(0, MAXIMO_POR_PRODUCTO);
}

// Se llama cuando las fotos ya quedaron puestas en un producto.
export async function vaciarFotos(chatId: number): Promise<void> {
  await listaBorrar(clave(chatId));
}
