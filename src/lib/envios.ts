// =============================================================
//  EL COSTO DEL ENVÍO
//
//  Una sola función decide cuánto cuesta llegar a un sitio, y la usan
//  el carrito, el cobro de Mercado Pago y el pedido por WhatsApp. Si
//  cada uno lo calculara por su cuenta, se mostraría un precio y se
//  cobraría otro, que es exactamente lo que no puede pasar.
//
//  Ojo: igual que con los productos, el envío que manda el navegador
//  NO se cree. Se recibe el nombre del destino y el precio se busca
//  aquí, en el servidor.
// =============================================================

import { DESTINOS, OTRAS_ZONAS, type Destino } from "@/data/envios";

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type Envio = {
  destino: string | null; // null = todavía no eligió
  costo: number;
  conocido: boolean; // false = hay que coordinar por WhatsApp
  aviso?: string;
};

export const SIN_DESTINO: Envio = { destino: null, costo: 0, conocido: false };

// Busca el destino por nombre. Acepta que lo escriban sin tildes, en
// mayúsculas o con el nombre largo ("SAN MARTIN DE PORRES").
export function buscarDestino(nombre: string): Destino | null {
  const buscado = normalizar(nombre);
  if (!buscado) return null;

  const exacto = DESTINOS.find((d) => normalizar(d.nombre) === buscado);
  if (exacto) return exacto;

  // "Trujillo" tiene que encontrar "Trujillo (La Libertad)", y "Ate"
  // no puede elegir al azar entre Ate Vitarte y Ate Santa Clara: si hay
  // más de uno, no se adivina.
  const parecidos = DESTINOS.filter(
    (d) => normalizar(d.nombre).startsWith(buscado) || buscado.startsWith(normalizar(d.nombre))
  );
  return parecidos.length === 1 ? parecidos[0] : null;
}

export function costoDeEnvio(nombre?: string | null): Envio {
  if (!nombre) return SIN_DESTINO;

  const destino = buscarDestino(nombre);
  if (!destino) {
    return { destino: nombre, costo: 0, conocido: false, aviso: OTRAS_ZONAS };
  }
  return { destino: destino.nombre, costo: destino.precio, conocido: true };
}

// Para el selector del carrito: agrupados y ordenados, que la lista es
// larga y buscar a ojo en 50 distritos desordenados cansa.
export function destinosAgrupados(): { grupo: string; destinos: Destino[] }[] {
  const porZona = (zona: Destino["zona"]) =>
    DESTINOS.filter((d) => d.zona === zona).sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es")
    );

  return [
    { grupo: "Lima y Callao", destinos: porZona("Lima") },
    { grupo: "Provincias", destinos: porZona("Provincia") },
  ];
}
