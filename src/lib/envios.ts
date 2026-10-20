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

  // Primero el nombre exacto, y los nombres con los que lo llama el
  // mapa ("Santiago de Surco" es Surco).
  const exacto = DESTINOS.find(
    (d) =>
      normalizar(d.nombre) === buscado ||
      (d.alias ?? []).some((a) => normalizar(a) === buscado)
  );
  if (exacto) return exacto;

  // Y si no, el nombre del destino tiene que estar COMPLETO al principio
  // de lo buscado ("Miraflores Lima" es Miraflores).
  //
  // Lo que ya no vale es al revés, que lo buscado sea el principio del
  // destino: con eso, una dirección cuya ciudad es "Lima" caía en "Lima
  // Cercado" y se le cobraban S/ 10 a cualquier distrito que no
  // estuviera en la tabla. Mejor decir que no se sabe.
  const parecidos = DESTINOS.filter((d) =>
    [d.nombre, ...(d.alias ?? [])].some((n) => {
      const nombreDestino = normalizar(n);
      return buscado.startsWith(nombreDestino + " ");
    })
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

// De lo que devuelve el mapa a un destino de la tabla. Se prueban los
// candidatos de lo más preciso a lo más general: "Miraflores" antes que
// "Lima", porque si gana el general, a todo Lima le cobraríamos igual.
export function destinoDeCandidatos(candidatos: string[]): Envio {
  for (const candidato of candidatos) {
    const destino = buscarDestino(candidato);
    if (destino) {
      return { destino: destino.nombre, costo: destino.precio, conocido: true };
    }
  }
  return {
    destino: candidatos[0] ?? null,
    costo: 0,
    conocido: false,
    aviso: OTRAS_ZONAS,
  };
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
