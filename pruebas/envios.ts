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
  destinoEnTexto,
  destinosAgrupados,
  envioGratisAplica,
} from "@/lib/envios";
import { DESTINOS } from "@/data/envios";
import { soloLaCalle, sinTipoDeVia, puntoValido } from "@/lib/geocodificador";

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

// Lo que devuelve el mapa de verdad para el centro de Lima: el nombre
// va dentro de otro más largo y tiene que encontrarse igual.
igual(
  "Urbanización Cercado de Lima es Lima Cercado",
  costoDeEnvio("Urbanización Cercado de Lima").costo,
  10
);
igual(
  "Villa El Salvador dentro de un nombre largo",
  costoDeEnvio("Asentamiento Villa El Salvador Sector 2").costo,
  15
);
// Pero un nombre corto NO se engancha dentro de otra palabra ni de
// cualquier frase: "Ica" aparece en mil sitios.
igual("un nombre corto no se cuela", buscarDestino("Jirón Ica"), null);

// El fallo que se vio con direcciones de verdad: la ciudad "Lima" caía
// en "Lima Cercado", así que a un distrito que no está en la tabla se
// le cobraban S/ 10 en vez de avisar que hay que coordinar.
const soloLima = destinoDeCandidatos(["Lurín", "Lima", "Lima Metropolitana"]);
igual("un distrito que no está no se cuela por 'Lima'", soloLima.conocido, false);
igual("y no se le cobra de menos", soloLima.costo, 0);

// --- El distrito escrito en la propia dirección ----------------------
// El caso que falló de verdad: el mapa no sabe resolver manzana y lote,
// pero el distrito estaba escrito ahí mismo.
igual(
  "lee el distrito de una dirección por manzana y lote",
  destinoEnTexto("Calle 3 Mz.E - Lt.24, San Martín de Porres 15112, Perú").costo,
  12
);
igual(
  "gana el distrito del final, no la calle del principio",
  destinoEnTexto("Calle Ica 123, Miraflores").destino,
  "Miraflores"
);
igual(
  "una dirección sin distrito conocido no inventa",
  destinoEnTexto("Calle 3 Mz.E - Lt.24, Lurín").conocido,
  false
);
igual("y un texto vacío tampoco", destinoEnTexto("").conocido, false);

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


// --- Quitar el número para poder encontrar la calle ------------------
// El caso real: "Jr. Río Oxapampa 583" no devuelve nada del mapa, pero
// "Río Oxapampa" sí. Sin esto parecía que la calle no existía.
igual(
  "quita el número de puerta",
  soloLaCalle("Jr. Rio Oxapampa 583"),
  "Jr. Rio Oxapampa"
);
igual(
  "quita manzana y lote",
  soloLaCalle("Calle 3 Mz. E Lt. 24"),
  "Calle 3"
);
igual(
  "se queda con la calle y tira el detalle del portal",
  soloLaCalle("Av. José Larco 1234, dpto. 502"),
  "Av. José Larco"
);
igual(
  "una calle sin número se queda igual",
  soloLaCalle("Avenida Universitaria"),
  "Avenida Universitaria"
);

igual("quita el Jr. de delante", sinTipoDeVia("Jr. Rio Oxapampa"), "Rio Oxapampa");
igual("quita la Av. de delante", sinTipoDeVia("Av. José Larco"), "José Larco");
igual("una calle sin tipo no se toca", sinTipoDeVia("Universitaria"), "Universitaria");
// "Calle 3" se quedaría en "3", que no es una calle: se deja entera.
igual("no deja un nombre vacío", sinTipoDeVia("Calle"), "Calle");

// --- El pin que mueve la clienta -------------------------------------
// Viene del navegador, así que se revisa como cualquier otra cosa que
// venga de fuera. Un punto en medio del mar rompería el enlace del
// reparto sin que nadie se diera cuenta hasta el día de la entrega.
igual(
  "un punto de Lima vale",
  JSON.stringify(puntoValido(-11.9725668, -77.0714426)),
  JSON.stringify({ lat: -11.972567, lon: -77.071443 })
);
igual("uno de Arequipa también", puntoValido(-16.409, -71.537)?.lat, -16.409);
igual("un punto fuera de Perú no", puntoValido(40.4, -3.7), null);
igual("el Pacífico tampoco", puntoValido(-12.0, -90.0), null);
igual("ni texto", puntoValido("-12" as unknown as number, -77), null);
igual("ni NaN", puntoValido(Number.NaN, -77), null);
igual("ni nada", puntoValido(undefined, undefined), null);

// --- El envío gratis y sus destinos ----------------------------------
// La promoción puede valer solo para algunas zonas. Quien sabe a dónde
// va el pedido es esta capa, no el motor de promociones.
igual("sin lista de destinos vale para donde sea", envioGratisAplica(undefined, "Comas"), true);
igual("una lista vacía también", envioGratisAplica([], "Comas"), true);
igual("el destino de la lista entra", envioGratisAplica(["Miraflores", "Surco"], "Miraflores"), true);
igual("uno que no está, no", envioGratisAplica(["Miraflores"], "Comas"), false);
// Los alias cuentan: la promo dice "Surco" y el pedido dice "Santiago
// de Surco", que es el mismo sitio.
igual("los alias cuentan", envioGratisAplica(["Surco"], "Santiago de Surco"), true);
// Mientras no se sepa a dónde va, no se regala nada: se regala cuando
// se sabe, para no enseñar "gratis" y luego cobrarlo.
igual("sin destino todavía, no se regala", envioGratisAplica(["Surco"], undefined), false);
igual("un destino que no está en la tabla tampoco", envioGratisAplica(["Surco"], "Cusco"), false);

console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLAS`);
process.exit(fallos === 0 ? 0 : 1);
