// =============================================================
//  FRENO A LOS INTENTOS DE CONTRASEÑA DEL PANEL
//
//  Sin esto, un programa puede probar miles de contraseñas por minuto
//  contra /admin/login hasta dar con la buena ("fuerza bruta"). Con
//  esto, cada dirección de internet tiene pocos intentos cada cuarto de
//  hora: a una persona que se equivoca le sobra, y a un programa le
//  llevaría siglos.
//
//  Se cuentan TODOS los intentos (buenos y malos): así no hace falta
//  leer y escribir por separado, y la dueña no entra veinte veces en
//  quince minutos.
// =============================================================

import { contar } from "@/lib/kv";

export const INTENTOS_POR_VENTANA = 10;
export const VENTANA_SEGUNDOS = 15 * 60;

// Deja solo caracteres de dirección IP: el valor viene de una cabecera
// y termina en el nombre de una clave de la base.
export function limpiarIp(bruta: string | null | undefined): string {
  const ip = (bruta ?? "").split(",")[0]?.trim() ?? "";
  return ip.replace(/[^a-zA-Z0-9.:_-]/g, "").slice(0, 45) || "desconocida";
}

// Anota un intento y dice si todavía se permite.
export async function permitirIntento(ip: string): Promise<boolean> {
  const n = await contar(`login-intentos-${limpiarIp(ip)}`, VENTANA_SEGUNDOS);
  return n <= INTENTOS_POR_VENTANA;
}
