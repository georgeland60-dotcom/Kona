// Pruebas del costo de envío. Se corre con:
//   node --experimental-strip-types --import ./pruebas/resolver.mjs pruebas/envios.ts
//
// No toca la red ni la base de datos: la tabla de envíos es un dato
// fijo de la tienda, así que esto comprueba justo lo que puede
// romperse al editarla (un nombre que ya no encuentra su precio).

import { costoDeEnvio, buscarDestino, destinosAgrupados } from "@/lib/envios";
import { DESTINOS } from "@/data/envios";

let fallos = 0;

function ok(que: string, condicion: boolean) {
  console.log(`${condicion ? "ok  " : "FALLA"} ${que}`);
  if (!condicion) fallos++;
}

function igual(que: string, a: unknown, b: unknown) {
  ok(`${que} (${JSON.stringify(a)} = ${JSON.stringify(b)})`, a === b);
}

// --- Lo que vale cada zona -------------------------------------------
igual("Miraflores cuesta 10", costoDeEnvio("Miraflores").costo, 10);
igual("Los Olivos cuesta 12", costoDeEnvio("Los Olivos").costo, 12);
igual("Comas cuesta 15", costoDeEnvio("Comas").costo, 15);
igual("Playas de Lima cuesta 18", costoDeEnvio("Playas de Lima").costo, 18);
igual("Arequipa cuesta 18", costoDeEnvio("Arequipa").costo, 18);
igual("Huancayo cuesta 12", costoDeEnvio("Huancayo").costo, 12);

// --- Cómo se escribe no importa --------------------------------------
igual("sin tildes", costoDeEnvio("jesus maria").costo, 10);
igual("en mayúsculas", costoDeEnvio("SAN MARTIN DE PORRES").costo, 12);
igual("con espacios de más", costoDeEnvio("  Rímac  ").costo, 15);
igual("Trujillo encuentra el largo", costoDeEnvio("Trujillo").costo, 15);

// --- Lo que NO se sabe no se inventa ---------------------------------
const desconocido = costoDeEnvio("Cusco");
igual("un destino que no está no cobra", desconocido.costo, 0);
igual("y se marca como no conocido", desconocido.conocido, false);
ok("y trae el aviso de coordinar", !!desconocido.aviso);

const vacio = costoDeEnvio("");
igual("sin destino no cobra", vacio.costo, 0);
igual("sin destino no hay nombre", vacio.destino, null);

// "Ate" solo no puede elegir entre Ate Vitarte y Ate Santa Clara: son
// precios distintos (10 y 15) y acertar por azar sería peor.
igual("un nombre ambiguo no adivina", buscarDestino("Ate"), null);

// --- La tabla en sí --------------------------------------------------
ok("no hay destinos repetidos",
  new Set(DESTINOS.map((d) => d.nombre.toLowerCase())).size === DESTINOS.length);
ok("todos tienen precio mayor que cero", DESTINOS.every((d) => d.precio > 0));
ok("todos los destinos se encuentran por su nombre",
  DESTINOS.every((d) => costoDeEnvio(d.nombre).costo === d.precio));

const grupos = destinosAgrupados();
igual("hay dos grupos en el selector", grupos.length, 2);
igual("el selector no pierde ningún destino",
  grupos.reduce((s, g) => s + g.destinos.length, 0), DESTINOS.length);

console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLAS`);
process.exit(fallos === 0 ? 0 : 1);
