// Prueba del arreglo automático del inventario. Se corre con:
//   node --experimental-strip-types --import ./pruebas/resolver.mjs pruebas/inventario.ts
//
// Qué se comprueba y por qué importa: producción guardó un día 10
// unidades inventadas de cada talla. Eso es vender lo que no hay. El
// arreglo tiene que cambiarlas por las de verdad la primera vez que
// alguien entra, no volver a hacerlo nunca más, y NO pisar los ajustes
// que haga la dueña después.
//
// Trabaja en una carpeta temporal propia: no toca los datos de nadie.

import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { INVENTARIO_REAL, CORTE_INVENTARIO } from "@/data/inventario-real";
import { products as semilla } from "@/data/products";

const temporal = await fs.mkdtemp(path.join(os.tmpdir(), "kona-inventario-"));
await fs.mkdir(path.join(temporal, "data"));
process.chdir(temporal);

// Se importa DESPUÉS de mudarse: lib/kv.ts decide su carpeta al cargarse.
const { readStore, rehacerInventarioReal } = await import("@/lib/store-data");
const archivo = path.join(temporal, "data", "store.json");

let fallos = 0;
const comprobar = (que: string, bien: boolean, detalle = "") => {
  console.log(`${bien ? "ok  " : "MAL "} ${que}${detalle ? ` — ${detalle}` : ""}`);
  if (!bien) fallos++;
};

const unidades = (d: { products: { variants: { stock: number }[] }[] }) =>
  d.products.reduce((s, p) => s + p.variants.reduce((a, v) => a + v.stock, 0), 0);
const tallas = (d: { products: { variants: unknown[] }[] }) =>
  d.products.reduce((s, p) => s + p.variants.length, 0);

const esperadasUnidades = Object.values(INVENTARIO_REAL).reduce(
  (s, filas) => s + filas.reduce((a, [, n]) => a + n, 0),
  0
);
const esperadasTallas = Object.values(INVENTARIO_REAL).reduce(
  (s, filas) => s + filas.length,
  0
);

// ---- 1. Lo que guardó producción: 10 inventadas de cada talla --------
const inventado = {
  updatedAt: new Date().toISOString(),
  products: semilla.map((p) => {
    const sizes = p.sizes && p.sizes.length > 0 ? p.sizes : ["Única"];
    const { sizes: _s, stock: _t, ...resto } = p;
    return {
      ...resto,
      active: true,
      variants: sizes.map((size) => ({
        size,
        sku: `KONA-${p.slug.toUpperCase()}-${size.toUpperCase()}`,
        stock: 10,
      })),
    };
  }),
};
await fs.writeFile(archivo, JSON.stringify(inventado), "utf8");

const primera = await readStore();
comprobar(
  "la primera lectura cambia el stock inventado por el real",
  unidades(primera) === esperadasUnidades,
  `${unidades(primera)} unidades (esperaba ${esperadasUnidades})`
);
comprobar(
  "y quita las tallas que ese producto nunca tuvo",
  tallas(primera) === esperadasTallas,
  `${tallas(primera)} tallas (esperaba ${esperadasTallas})`
);
comprobar(
  "deja la fecha del corte anotada",
  primera.inventarioReal === CORTE_INVENTARIO
);

const enDisco = JSON.parse(await fs.readFile(archivo, "utf8"));
comprobar(
  "lo guarda, no solo lo calcula al vuelo",
  unidades(enDisco) === esperadasUnidades &&
    enDisco.inventarioReal === CORTE_INVENTARIO
);

// ---- 2. Lo que la dueña ajuste después NO se pisa ---------------------
const conAjuste = JSON.parse(await fs.readFile(archivo, "utf8"));
const victima = conAjuste.products.find(
  (p: { id: string }) => INVENTARIO_REAL[p.id]
);
victima.variants[0].stock = 99;
await fs.writeFile(archivo, JSON.stringify(conAjuste), "utf8");

const segunda = await readStore();
const despues = segunda.products.find(
  (p: { id: string }) => p.id === victima.id
);
comprobar(
  "un ajuste a mano sobrevive a la siguiente lectura",
  despues?.variants[0].stock === 99,
  `quedó en ${despues?.variants[0].stock}`
);

// ---- 3. El botón del panel sí lo devuelve todo a su sitio -------------
const rehecho = await rehacerInventarioReal();
comprobar(
  "el botón del panel vuelve a dejar el inventario del backup",
  rehecho.guardado &&
    rehecho.unidades === esperadasUnidades &&
    rehecho.productos === Object.keys(INVENTARIO_REAL).length,
  `${rehecho.productos} productos, ${rehecho.unidades} unidades`
);

// ---- 4. Si la base no contesta, no se escribe nada -------------------
//
// Se simula con un store.json ilegible (JSON roto): es lo mismo que ve
// el código cuando la lectura falla. Antes devolvía los datos de fábrica
// y los escribía encima; eso borraría el inventario bueno.
await fs.writeFile(archivo, "{ esto no es json", "utf8");
const roto = await readStore();
comprobar(
  "con la base ilegible devuelve datos de fábrica",
  unidades(roto) === esperadasUnidades
);
comprobar(
  "y NO escribe encima",
  (await fs.readFile(archivo, "utf8")) === "{ esto no es json"
);

await fs.rm(temporal, { recursive: true, force: true });
console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLOS`);
if (fallos > 0) process.exit(1);
