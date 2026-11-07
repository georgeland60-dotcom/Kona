// Pruebas de las guías de tallas. Se corre con:
//   node --experimental-strip-types --import ./pruebas/resolver.mjs pruebas/tallas.ts
//
// No toca red ni base de datos: las guías son datos fijos de la
// tienda, y lo que puede romperse es justo lo que se comprueba aquí —
// un slug mal escrito deja a una prenda sin tabla y nadie se entera
// hasta que una clienta pregunta.

import { GUIAS_DE_TALLAS, guiaDelModelo } from "@/data/guias-tallas";
import { products as semilla } from "@/data/products";
import { INVENTARIO_REAL } from "@/data/inventario-real";
import { guiaDeProducto, guiaEnTexto, compararTallas } from "@/lib/tallas";
import { store } from "@/config/store";
import type { Product, SeedProduct } from "@/lib/types";

let fallos = 0;
function ok(que: string, condicion: boolean) {
  console.log(`${condicion ? "ok  " : "FALLA"} ${que}`);
  if (!condicion) fallos++;
}
function igual(que: string, a: unknown, b: unknown) {
  ok(`${que} (${JSON.stringify(a)} = ${JSON.stringify(b)})`, a === b);
}

// Igual que hace la tienda al arrancar sin nada guardado: las tallas
// que de verdad se venden salen del inventario real, no de la semilla.
// Si esto no se hiciera igual, las pruebas dirían que una guía se ve
// cuando en la tienda no se ve (o al revés).
function aProducto(seed: SeedProduct): Product {
  const real = INVENTARIO_REAL[seed.id];
  const sizes = real
    ? real.map(([talla]) => talla)
    : seed.sizes && seed.sizes.length > 0
      ? seed.sizes
      : ["Única"];
  const stock = (talla: string) =>
    real ? (real.find(([t]) => t === talla)?.[1] ?? 0) : 10;
  const { sizes: _s, stock: _st, ...resto } = seed;
  return {
    ...resto,
    variants: sizes.map((size) => ({ size, sku: `X-${size}`, stock: stock(size) })),
    active: resto.active ?? true,
  };
}

const CATALOGO = (semilla as SeedProduct[]).map(aProducto);
const por = (slug: string) => {
  const p = CATALOGO.find((x) => x.slug === slug);
  if (!p) throw new Error(`no existe el producto ${slug}`);
  return p;
};

// --- Ningún slug mal escrito -----------------------------------------
// Un slug que no existe no da error en ninguna parte: simplemente esa
// prenda se queda sin tabla, calladita.
const slugsDelCatalogo = new Set(CATALOGO.map((p) => p.slug));
for (const { slugs } of GUIAS_DE_TALLAS) {
  for (const slug of slugs) {
    ok(`la guía de ${slug} apunta a un producto que existe`, slugsDelCatalogo.has(slug));
  }
}

// --- Ninguna guía se queda sin filas ---------------------------------
// Si las tallas de la foto no coinciden con las que se venden, se
// filtran todas y la tabla desaparece sin avisar.
for (const { slugs } of GUIAS_DE_TALLAS) {
  const alguna = slugs.some((slug) => {
    if (!slugsDelCatalogo.has(slug)) return false;
    const guia = guiaDeProducto(por(slug));
    return !!guia && !guia.estimada && guia.prendas.length > 0;
  });
  ok(`la guía de ${slugs[0]} llega a verse en la tienda`, alguna);
}

// --- El Set Majo: dos prendas, no una --------------------------------
// Era el fallo que se vio: mostraba una sola tabla, con las medidas de
// un vestido inventadas por la categoría "conjuntos".
const majo = guiaDeProducto(por("set-majo-celeste"))!;
ok("el Set Majo tiene guía", !!majo);
igual("y NO es estimada", majo.estimada, false);
igual("trae dos prendas", majo.prendas.length, 2);
igual("la primera es la polera", majo.prendas[0].nombre, "Polera");
igual("la segunda es la palazzo", majo.prendas[1].nombre, "Palazzo");
igual(
  "la polera M mide 122 de busto (como la foto)",
  majo.prendas[0].medidas.find((m) => m.talla === "M")?.medidas.busto,
  122
);
igual(
  "la palazzo M tiene cintura en rango",
  majo.prendas[1].medidas.find((m) => m.talla === "M")?.medidas.cintura,
  "75-95"
);
// La polera mide busto; la palazzo, cintura. Mezclarlas es justo lo
// que no se entendía.
ok(
  "la polera no habla de cintura",
  majo.prendas[0].medidas.every((m) => m.medidas.cintura === undefined)
);
ok(
  "la palazzo no habla de busto",
  majo.prendas[1].medidas.every((m) => m.medidas.busto === undefined)
);
ok(
  "en texto se distinguen las dos prendas",
  guiaEnTexto(majo).includes("Polera —") && guiaEnTexto(majo).includes("Palazzo —")
);
igual("el Set Majo negro usa la misma guía", guiaDelModelo("set-majo-negro"), guiaDelModelo("set-majo-celeste"));

// --- Solo las tallas que se venden -----------------------------------
// La foto del palazzo Tefa trae S, pero el palazzo se vende de la M
// para arriba: una fila de una talla que no se puede pedir despista.
const tefa = guiaDeProducto(por("palazzo-tefa-beige"))!;
ok(
  "el palazzo Tefa no enseña la S, que no se vende",
  tefa.prendas[0].medidas.every((m) => m.talla !== "S")
);
igual(
  "y sí enseña las tres que sí",
  tefa.prendas[0].medidas.map((m) => m.talla).join(","),
  "M,L,XL"
);

// El cárdigan Joy se vende en S pero la foto empieza en M: no se
// inventa la fila que falta.
const joy = guiaDeProducto(por("cardigan-joy-rosa"))!;
ok("el cárdigan Joy no inventa la S", joy.prendas[0].medidas.every((m) => m.talla !== "S"));
ok("y lo dice en la nota", joy.nota.includes("talla S"));

// --- Los pantalones van por número -----------------------------------
const ari = guiaDeProducto(por("jean-flare-ari-azul"))!;
igual(
  "el flare Ari va del 30 al 40, en orden",
  ari.prendas[0].medidas.map((m) => m.talla).join(","),
  "30,32,34,36,38,40"
);
igual(
  "y la 34 tiene la cintura de la foto",
  ari.prendas[0].medidas.find((m) => m.talla === "34")?.medidas.cintura,
  "77-97"
);

// --- Lo que no tiene guía publicada no se inventa --------------------
// Con medidasEstimadas en false (como está hoy), una prenda sin tabla
// en sus fotos no enseña centímetros calculados: la ficha remite a las
// fotos y ofrece medirla por WhatsApp.
const sami = guiaDeProducto(por("pantalon-dril-sami"));
if (store.medidasEstimadas) {
  ok("sin guía publicada, las medidas van marcadas como estimadas", sami?.estimada === true);
} else {
  igual("sin guía publicada no se inventan medidas", sami, null);
}

// --- Las tallas se ordenan de menor a mayor --------------------------
igual("S va antes que M", compararTallas("S", "M") < 0, true);
igual("XL va después de L", compararTallas("XL", "L") > 0, true);

// --- Nada de medidas vacías ------------------------------------------
for (const { slugs, guia } of GUIAS_DE_TALLAS) {
  for (const prenda of guia.prendas) {
    for (const fila of prenda.medidas) {
      ok(
        `${slugs[0]} ${prenda.nombre ?? ""} ${fila.talla} trae medidas`,
        Object.keys(fila.medidas).length > 0
      );
    }
  }
}

console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLAS`);
process.exit(fallos === 0 ? 0 : 1);
