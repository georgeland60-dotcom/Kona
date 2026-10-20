// Pruebas del costo de envío. Se corre con:
//   node --experimental-strip-types --import ./pruebas/resolver.mjs pruebas/envios.ts
//
// No toca la red ni la base de datos: la tabla de envíos es un dato
// fijo de la tienda, así que esto comprueba justo lo que puede
// romperse al editarla (un nombre que ya no encuentra su precio).

import {
  costoDeEnvio,
  buscarDestino,
  destinoDeCandidatos,
  destinosAgrupados,
} from "@/lib/envios";
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

// "San Juan" no puede elegir entre San Juan de Lurigancho y San Juan de
// Miraflores: son precios distintos (12 y 15) y acertar por azar sería
// peor que preguntar.
igual("un nombre ambiguo no adivina", buscarDestino("San Juan"), null);

// "Ate" sí se resuelve, y a propósito: el mapa dice "Ate" para todo el
// distrito, y la mayoría es Vitarte. Queda elegido Ate Vitarte (S/ 10)
// y el selector sigue a la vista para corregir a Santa Clara (S/ 15).
igual("Ate se toma como Ate Vitarte", costoDeEnvio("Ate").destino, "Ate Vitarte");

// --- Lo que devuelve el mapa ------------------------------------------
// Vienen de lo más preciso a lo más general. Tiene que ganar el
// distrito: si ganara "Lima", a toda la ciudad le cobraríamos igual.
igual(
  "el distrito manda sobre la ciudad",
  destinoDeCandidatos(["Miraflores", "Lima", "Lima"]).costo,
  10
);
igual(
  "si el primero no está en la tabla, prueba el siguiente",
  destinoDeCandidatos(["Urbanización Santa Cruz", "Miraflores", "Lima"]).destino,
  "Miraflores"
);
igual(
  "una ciudad de provincia que sí está",
  destinoDeCandidatos(["Centro", "Arequipa", "Arequipa"]).costo,
  18
);
const fuera = destinoDeCandidatos(["Centro", "Cusco", "Cusco"]);
igual("y una que no, no cobra", fuera.costo, 0);
igual("pero conserva lo que dijo el mapa", fuera.destino, "Centro");
igual("sin candidatos no hay destino", destinoDeCandidatos([]).destino, null);

// --- Los nombres que usa el mapa -------------------------------------
igual("Santiago de Surco es Surco", costoDeEnvio("Santiago de Surco").costo, 10);
igual("Cercado de Lima es Lima Cercado", costoDeEnvio("Cercado de Lima").costo, 10);
igual("Lurigancho es Chosica", costoDeEnvio("Lurigancho").costo, 15);
igual("Punta Hermosa son playas", costoDeEnvio("Punta Hermosa").costo, 18);
igual("Magdalena del Mar es Magdalena", costoDeEnvio("Magdalena del Mar").costo, 10);
igual("Miraflores Lima sigue siendo Miraflores", costoDeEnvio("Miraflores Lima").costo, 10);

// El fallo que se vio con direcciones de verdad: la ciudad "Lima" caía
// en "Lima Cercado", así que a un distrito que no está en la tabla se
// le cobraban S/ 10 en vez de avisar que hay que coordinar.
const soloLima = destinoDeCandidatos(["Lurín", "Lima", "Lima Metropolitana"]);
igual("un distrito que no está no se cuela por 'Lima'", soloLima.conocido, false);
igual("y no se le cobra de menos", soloLima.costo, 0);

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
