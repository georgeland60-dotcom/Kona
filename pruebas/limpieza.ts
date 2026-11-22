// Prueba de la limpieza de productos de prueba. Se corre con:
//   node --experimental-strip-types --import ./pruebas/resolver.mjs pruebas/limpieza.ts
//
// Qué se comprueba: las botas y la blusa que se subieron probando el bot
// desaparecen de la tienda y la categoría "Calzado" del menú, UNA vez.
// Nada más se toca: ni otro producto, ni otra categoría creada, ni un
// producto nuevo que herede el mismo id, ni "Calzado" si se vuelve a
// crear de verdad.
//
// Trabaja en una carpeta temporal propia: no toca los datos de nadie.

import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { CORTE_INVENTARIO } from "@/data/inventario-real";

const temporal = await fs.mkdtemp(path.join(os.tmpdir(), "kona-limpieza-"));
await fs.mkdir(path.join(temporal, "data"));
process.chdir(temporal);

const { readStore, getProducts, LIMPIEZA_PRUEBAS } = await import("@/lib/store-data");
const { getCategorias, crearCategoria } = await import("@/lib/categorias-data");
const tienda = path.join(temporal, "data", "store.json");
const categorias = path.join(temporal, "data", "categorias.json");

let fallos = 0;
const comprobar = (que: string, bien: boolean, detalle = "") => {
  console.log(`${bien ? "ok  " : "MAL "} ${que}${detalle ? ` — ${detalle}` : ""}`);
  if (!bien) fallos++;
};

const prenda = (id: string, slug: string, category: string) => ({
  id, slug, name: slug, price: 100, category, active: true,
  variants: [{ size: "M", sku: `KONA-${slug.toUpperCase()}-M`, stock: 3 }],
});

// ---- Lo que hay en producción ---------------------------------------
const real = prenda("100", "pantalon-killa", "pantalones");
await fs.writeFile(
  tienda,
  JSON.stringify({
    updatedAt: new Date().toISOString(),
    inventarioReal: CORTE_INVENTARIO, // que no se meta la carga del inventario
    products: [
      real,
      prenda("12828", "botas-negras", "calzado"),
      prenda("12829", "blusa-blanca-de-verano", "blusas"),
      prenda("200", "cinnamon-bag-beige", "carteras"),
    ],
  }),
  "utf8"
);
await fs.writeFile(
  categorias,
  JSON.stringify({
    categorias: [
      { slug: "blazers", name: "Blazers" },
      { slug: "calzado", name: "Calzado" },
    ],
  }),
  "utf8"
);

// ---- 1. Productos --------------------------------------------------
const primera = await readStore();
const slugs = primera.products.map((p) => p.slug);
comprobar("quita las botas de prueba", !slugs.includes("botas-negras"));
comprobar("quita la blusa de prueba", !slugs.includes("blusa-blanca-de-verano"));
comprobar(
  "no toca los productos de verdad",
  slugs.length === 2 && primera.products[0].variants[0].stock === 3,
  slugs.join(", ")
);
const cartera = primera.products.find((p) => p.slug === "cinnamon-bag-beige");
comprobar(
  "la cartera se oculta, no se borra",
  cartera?.active === false && cartera.variants[0].stock === 3
);
comprobar(
  "y no sale en la tienda",
  !(await getProducts()).some((p) => p.category === "carteras")
);
const enDisco = JSON.parse(await fs.readFile(tienda, "utf8"));
comprobar(
  "lo guarda con la fecha anotada",
  enDisco.products.length === 2 && enDisco.pruebasRetiradas === LIMPIEZA_PRUEBAS
);

// Si la dueña vuelve a activar una cartera desde el panel, se queda.
enDisco.products.find((p: { slug: string }) => p.slug === "cinnamon-bag-beige").active = true;
await fs.writeFile(tienda, JSON.stringify(enDisco), "utf8");
comprobar(
  "una cartera reactivada a mano sigue activa",
  (await readStore()).products.find((p) => p.slug === "cinnamon-bag-beige")?.active === true
);

// Un producto nuevo hereda el id 12828 (el siguiente libre): no se borra.
enDisco.products.push(prenda("12828", "vestido-nuevo", "vestidos"));
await fs.writeFile(tienda, JSON.stringify(enDisco), "utf8");
const segunda = await readStore();
comprobar(
  "un producto nuevo con el mismo id se queda",
  segunda.products.some((p) => p.slug === "vestido-nuevo")
);

// ---- 2. Categorías -------------------------------------------------
const menu = (await getCategorias()).map((c) => c.slug);
comprobar("quita Calzado del menú", !menu.includes("calzado"));
comprobar("deja las demás categorías creadas", menu.includes("blazers"));
comprobar("y las de siempre", menu.includes("pantalones"));

const creada = await crearCategoria("Calzado");
const menuDespues = (await getCategorias()).map((c) => c.slug);
comprobar(
  "si se vuelve a crear Calzado de verdad, se queda",
  creada.ok && menuDespues.includes("calzado")
);

// ---- 3. Con la base ilegible no se escribe nada ---------------------
await fs.writeFile(categorias, "{ roto", "utf8");
const sinBase = await crearCategoria("Zapatillas");
comprobar(
  "crear una categoría con la base caída no borra las guardadas",
  !sinBase.ok && (await fs.readFile(categorias, "utf8")) === "{ roto"
);

await fs.rm(temporal, { recursive: true, force: true });
console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLOS`);
if (fallos > 0) process.exit(1);
