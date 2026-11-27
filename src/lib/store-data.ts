// =============================================================
//  CAPA DE DATOS DE LA TIENDA
//  Guarda los productos, tallas, SKU y stock en un documento JSON
//  llamado "store". Dónde se guarda (disco local o base KV) lo
//  decide lib/kv.ts; aquí solo pedimos leer y escribir.
//
//  La PRIMERA vez se crea solo, copiando los productos de
//  data/products.ts (la "semilla") y generando SKU + stock.
// =============================================================

import { products as seedProducts } from "@/data/products";
import type { Product, SeedProduct, Variant } from "@/lib/types";
import { INVENTARIO_REAL, CORTE_INVENTARIO } from "@/data/inventario-real";
import { applyDiscounts, getLiveRules, withDiscount } from "@/lib/promos-data";
import { leerDoc, writeDoc } from "@/lib/kv";

type StoreData = {
  products: Product[];
  updatedAt: string;
  // Fecha del inventario de la tienda anterior que ya está aplicado.
  // Mientras no coincida con CORTE_INVENTARIO, los datos guardados
  // todavía llevan el stock inventado y hay que corregirlos.
  inventarioReal?: string;
  // Fecha de la limpieza de productos de prueba ya hecha (ver
  // PRUEBAS_RETIRADAS). Igual que la anterior: se hace una sola vez.
  pruebasRetiradas?: string;
  // Fecha en que se ocultaron las carteras (ver CARTERAS_RETIRADAS).
  carterasRetiradas?: string;
  // Fecha en que los jeans de Pantalones pasaron también a Full Denim.
  denimAgregado?: string;
  stockPrueba?: string;
  precioPrueba?: string;
  blazersAgregados?: string;
  fotosBlazers?: string;
  fotosCeleste?: string;
};

// ---- Helpers de SKU --------------------------------------------------

// Convierte texto a mayúsculas sin acentos ni símbolos raros.
function slugUpper(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Genera un SKU legible: KONA-<SLUG>-<TALLA>
export function skuFor(slug: string, size: string): string {
  return `KONA-${slugUpper(slug)}-${slugUpper(size)}`;
}

// Convierte un producto "semilla" (con sizes) a Product (con variants).
//
// Las tallas y las unidades salen del INVENTARIO REAL (lo que había en
// la tienda anterior el 1 de noviembre) cuando ese producto está ahí.
// Antes todos nacían con 10 unidades de cada talla: 3.210 unidades
// inventadas, y tallas que ese producto nunca tuvo. Un stock inventado
// en una tienda es vender lo que no hay.
function seedToProduct(seed: SeedProduct): Product {
  const real = INVENTARIO_REAL[seed.id];

  const variants: Variant[] = real
    ? real.map(([size, stock]) => ({
        size,
        sku: skuFor(seed.slug, size),
        stock,
      }))
    : (seed.sizes && seed.sizes.length > 0 ? seed.sizes : ["Única"]).map(
        (size) => ({ size, sku: skuFor(seed.slug, size), stock: seed.stock ?? 10 })
      );

  const { sizes: _omit, stock: _omit2, ...rest } = seed;
  return { ...rest, variants, active: rest.active ?? true };
}

// ---- Lectura / escritura del archivo --------------------------------

// Datos "en fábrica" a partir de la semilla (data/products.ts). Se usan
// mientras no se haya guardado nada todavía.
function seedData(): StoreData {
  return {
    products: seedProducts.map(seedToProduct),
    updatedAt: new Date().toISOString(),
  };
}

// ---- El stock inventado, de una vez -----------------------------------
//
//  La tienda nueva nació con 10 unidades de cada talla porque al
//  importar el catálogo no había stock de dónde sacarlo. Eso es vender
//  lo que no hay: una clienta paga una talla que no existe y alguien
//  tiene que llamarla a devolverle el dinero.
//
//  Una tienda recién creada ya nace bien (seedToProduct lee el
//  inventario real). El problema son las tiendas que YA guardaron los
//  10 inventados, como producción. Esto lo arregla la primera vez que
//  alguien entra, sin que nadie tenga que apretar nada, y deja la fecha
//  del corte anotada para no volver a hacerlo nunca más.
export function conInventarioReal(productos: Product[]): Product[] {
  return productos.map((producto) => {
    const real = INVENTARIO_REAL[producto.id];
    if (!real) return producto; // no estaba en la tienda anterior: no se toca

    const variants: Variant[] = real.map(([size, stock]) => ({
      size,
      // El SKU se conserva si esa talla ya existía: es lo que enlaza el
      // stock con los pedidos que ya están hechos.
      sku:
        producto.variants.find((v) => v.size === size)?.sku ??
        skuFor(producto.slug, size),
      stock,
    }));

    return { ...producto, variants };
  });
}

// Lo mismo, pero a mano desde el panel: vuelve a dejar el inventario
// del backup aunque ya estuviera aplicado. Sirve de botón de pánico si
// alguien se lía ajustando tallas.
export async function rehacerInventarioReal(): Promise<{
  productos: number;
  unidades: number;
  guardado: boolean;
}> {
  const leido = await leerDoc<StoreData>("store");
  const datos = leido.ok ? leido.valor : seedData();
  const products = conInventarioReal(datos.products);

  const tocados = products.filter((p) => INVENTARIO_REAL[p.id]);
  const guardado = await writeStore({
    ...datos,
    products,
    inventarioReal: CORTE_INVENTARIO,
  });

  return {
    productos: tocados.length,
    unidades: tocados.reduce(
      (total, p) => total + p.variants.reduce((s, v) => s + v.stock, 0),
      0
    ),
    guardado,
  };
}

// ---- Productos de prueba, fuera ----------------------------------------
//
//  En septiembre, probando el bot de Telegram, se subieron dos prendas
//  que nunca fueron de la tienda: unas botas y una blusa con foto de
//  catálogo. La carga del inventario real no las quitó porque, a
//  propósito, no toca lo que no estaba en la tienda anterior (así no se
//  pierde lo que la dueña suba por su cuenta). Quedaron a la venta.
//
//  Se quitan una sola vez, la primera vez que alguien entra. Se buscan
//  por id Y por slug: el id se reutiliza (el siguiente producto que se
//  cree puede llevar el 12828) y no se puede borrar algo de verdad por
//  parecerse a una prueba.
const PRUEBAS_RETIRADAS = [
  { id: "12828", slug: "botas-negras" },
  { id: "12829", slug: "blusa-blanca-de-verano" },
];
export const LIMPIEZA_PRUEBAS = "2026-11-22";

export function sinPruebas(productos: Product[]): Product[] {
  return productos.filter(
    (p) => !PRUEBAS_RETIRADAS.some((r) => r.id === p.id && r.slug === p.slug)
  );
}

// ---- Carteras, fuera de la vista ---------------------------------------
//
//  Kona dejó de vender carteras (22 nov 2026): la categoría salió del
//  menú y de la semilla. Pero los productos de la tienda desplegada viven
//  en la base, no en la semilla, así que las carteras seguían saliendo en
//  "Todo" y en su enlace, colgando de una categoría que ya no existe.
//
//  No se borran: se ocultan (active: false), que es reversible desde el
//  panel y conserva fotos e historial. Una sola vez: si un día la dueña
//  vuelve a activar una, se queda activa.
export const CARTERAS_RETIRADAS = "2026-11-22";

export function sinCarteras(productos: Product[]): Product[] {
  return productos.map((p) =>
    p.category === "carteras" ? { ...p, active: false } : p
  );
}

// ---- Los jeans, también en Full Denim ----------------------------------
//
//  Full Denim solo tenía las dos casacas: los jeans vivían en Pantalones
//  y nadie que entrara a Denim los veía. Se suman a Full Denim SIN salir
//  de Pantalones (por eso es una colección y no un cambio de categoría):
//  un jean es las dos cosas. Son los ocho cuya tela es denim según su
//  propia descripción. Una sola vez, por id y slug, como lo demás.
const JEANS_A_DENIM = [
  { id: "9414", slug: "paper-bag-leti-golden-beige" },
  { id: "9415", slug: "paper-bag-leti-negro" },
  { id: "9742", slug: "slouchy-jean-cris-2" },
  { id: "9785", slug: "slouchy-jean-cris" },
  { id: "10141", slug: "jean-flare-ari-azul" },
  { id: "10153", slug: "jean-flare-ari-negro" },
  { id: "10181", slug: "paper-bag-jean-lu" },
  { id: "12827", slug: "palazzo-jean-baggy" },
];
// El producto "Prueba" (S/ 1, para probar cobros reales) se quedó sin
// unidades con los intentos de pago del 27 nov 2026. La dueña pidió
// dejarle 5 para seguir probando. Solo ese producto, y una sola vez.
export const STOCK_PRUEBA = "2026-11-27";
export function conStockDePrueba(productos: Product[]): Product[] {
  return productos.map((p) =>
    p.slug === "prueba" && p.name === "Prueba" && p.price <= 1
      ? { ...p, variants: (p.variants ?? []).map((v) => ({ ...v, stock: 5 })) }
      : p
  );
}

// Y a S/ 5 (27 nov 2026): con S/ 1 Mercado Pago podría estar cortando
// el cobro por monto mínimo, y es justo lo que se quiere descartar.
export const PRECIO_PRUEBA = "2026-11-27";
export function conPrecioDePrueba(productos: Product[]): Product[] {
  return productos.map((p) =>
    p.slug === "prueba" && p.name === "Prueba" ? { ...p, price: 5 } : p
  );
}

export const DENIM_AGREGADO = "2026-11-22";

export function conJeansEnDenim(productos: Product[]): Product[] {
  return productos.map((p) => {
    const esJean = JEANS_A_DENIM.some((j) => j.id === p.id && j.slug === p.slug);
    const ya = (p.collections ?? []).includes("full-denim");
    return esJean && !ya
      ? { ...p, collections: [...(p.collections ?? []), "full-denim"] }
      : p;
  });
}

// ---- Los blazers de Black Friday ---------------------------------------
//
//  La categoría Blazers existía vacía. La dueña pasó tallas y stock el
//  27 nov 2026, precio regular S/ 159 los tres. Van por aquí (y no por
//  el panel) porque el panel no carga galerías de varias fotos.
//  El celeste todavía no tiene fotos: la dueña pidió usar las del azul
//  mientras tanto. Una sola vez; si ya existe un producto con ese slug
//  (creado a mano), no se toca.
export const BLAZERS_AGREGADOS = "2026-11-27";

const DESCRIPCION_BLAZER =
  "Blazer de corte relajado, con manga 3/4 de vuelta y un solo botón. " +
  "Va igual de bien con jean que con pantalón de vestir o sobre un vestido.";

// La primera es la principal. La dueña eligió (27 nov 2026): la del azul
// en la mesa con el café y la del verde levantando la cartera.
const FOTOS_VERDE = [4, 1, 2, 3].map((n) => `/products/blazer-verde-menta-${n}.webp`);
const FOTOS_AZUL = [2, 1, 3].map((n) => `/products/blazer-azul-${n}.webp`);
// Las del celeste llegaron después (27 nov 2026): de pie riendo como
// principal y sentada en el sofá como segunda.
const FOTOS_CELESTE = [1, 2].map((n) => `/products/blazer-celeste-${n}.webp`);
const FOTOS_VERDE_ANTES = [1, 2, 3, 4].map((n) => `/products/blazer-verde-menta-${n}.webp`);
const FOTOS_AZUL_ANTES = [1, 2, 3].map((n) => `/products/blazer-azul-${n}.webp`);

const BLAZERS: { slug: string; name: string; fotos: string[]; tallas: [string, number][] }[] = [
  {
    slug: "blazer-verde-menta",
    name: "Blazer Verde Menta",
    fotos: FOTOS_VERDE,
    tallas: [["M", 2], ["L", 2], ["XL", 2], ["XXXL", 1]],
  },
  {
    slug: "blazer-azul",
    name: "Blazer Azul",
    fotos: FOTOS_AZUL,
    tallas: [["L", 2], ["XL", 2]],
  },
  {
    slug: "blazer-celeste",
    name: "Blazer Celeste",
    fotos: FOTOS_CELESTE,
    tallas: [["M", 2], ["L", 2]],
  },
];

export function conBlazers(productos: Product[]): Product[] {
  let max = productos.reduce((m, p) => {
    const n = parseInt(p.id, 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  const nuevos: Product[] = [];
  for (const b of BLAZERS) {
    if (productos.some((p) => p.slug === b.slug)) continue;
    max += 1;
    nuevos.push({
      id: String(max),
      slug: b.slug,
      name: b.name,
      price: 159,
      category: "blazers",
      image: b.fotos[0],
      images: b.fotos,
      description: DESCRIPCION_BLAZER,
      variants: b.tallas.map(([size, stock]) => ({
        size,
        sku: skuFor(b.slug, size),
        stock,
      })),
      collections: ["nuevos-ingresos"],
      active: true,
    });
  }
  return [...productos, ...nuevos];
}

// Los blazers ya creados con el orden viejo de fotos pasan al nuevo. Solo
// si siguen con el orden viejo tal cual: si alguien las cambió a mano,
// se respeta. Una sola vez.
export const FOTOS_BLAZERS = "2026-11-27b";

export function conFotosDeBlazers(productos: Product[]): Product[] {
  const igual = (a: string[] | undefined, b: string[]) =>
    !!a && a.length === b.length && a.every((x, i) => x === b[i]);
  return productos.map((p) => {
    if (!p.slug.startsWith("blazer-")) return p;
    const nuevas = igual(p.images, FOTOS_VERDE_ANTES)
      ? FOTOS_VERDE
      : igual(p.images, FOTOS_AZUL_ANTES)
        ? FOTOS_AZUL
        : null;
    return nuevas ? { ...p, images: nuevas, image: nuevas[0] } : p;
  });
}

// El celeste ya creado con las fotos provisionales del azul pasa a las
// suyas. Solo si sigue con las del azul (en cualquiera de los dos
// órdenes): si alguien le puso otras a mano, se respetan. Una sola vez.
export const FOTOS_CELESTE_PUESTAS = "2026-11-27";

export function conFotosDelCeleste(productos: Product[]): Product[] {
  return productos.map((p) => {
    if (p.slug !== "blazer-celeste") return p;
    const provisional = (p.images ?? []).every((i) => i.startsWith("/products/blazer-azul-"));
    return provisional ? { ...p, images: FOTOS_CELESTE, image: FOTOS_CELESTE[0] } : p;
  });
}

export async function readStore(): Promise<StoreData> {
  const leido = await leerDoc<StoreData>("store");

  // Sin datos guardados (tienda nueva) o con la base caída: los datos de
  // fábrica, que ya traen el inventario real. No se escribe NADA: si la
  // base no contestó, escribir encima sería borrar el inventario bueno.
  if (!leido.ok) return seedData();

  const datos = leido.valor;
  const faltaInventario = datos.inventarioReal !== CORTE_INVENTARIO;
  const faltaLimpieza = datos.pruebasRetiradas !== LIMPIEZA_PRUEBAS;
  const faltanCarteras = datos.carterasRetiradas !== CARTERAS_RETIRADAS;
  const faltaDenim = datos.denimAgregado !== DENIM_AGREGADO;
  const faltaStockPrueba = datos.stockPrueba !== STOCK_PRUEBA;
  const faltaPrecioPrueba = datos.precioPrueba !== PRECIO_PRUEBA;
  const faltanBlazers = datos.blazersAgregados !== BLAZERS_AGREGADOS;
  const faltanFotosBlazers = datos.fotosBlazers !== FOTOS_BLAZERS;
  const faltanFotosCeleste = datos.fotosCeleste !== FOTOS_CELESTE_PUESTAS;
  if (
    !faltaInventario &&
    !faltaLimpieza &&
    !faltanCarteras &&
    !faltaDenim &&
    !faltaStockPrueba &&
    !faltaPrecioPrueba &&
    !faltanBlazers &&
    !faltanFotosBlazers &&
    !faltanFotosCeleste
  ) {
    return datos;
  }

  let corregidos: StoreData = datos;
  if (faltaInventario) {
    corregidos = {
      ...corregidos,
      products: conInventarioReal(corregidos.products),
      inventarioReal: CORTE_INVENTARIO,
    };
  }
  if (faltaLimpieza) {
    corregidos = {
      ...corregidos,
      products: sinPruebas(corregidos.products),
      pruebasRetiradas: LIMPIEZA_PRUEBAS,
    };
  }
  if (faltanCarteras) {
    corregidos = {
      ...corregidos,
      products: sinCarteras(corregidos.products),
      carterasRetiradas: CARTERAS_RETIRADAS,
    };
  }
  if (faltaDenim) {
    corregidos = {
      ...corregidos,
      products: conJeansEnDenim(corregidos.products),
      denimAgregado: DENIM_AGREGADO,
    };
  }
  if (faltaStockPrueba) {
    corregidos = {
      ...corregidos,
      products: conStockDePrueba(corregidos.products),
      stockPrueba: STOCK_PRUEBA,
    };
  }
  if (faltaPrecioPrueba) {
    corregidos = {
      ...corregidos,
      products: conPrecioDePrueba(corregidos.products),
      precioPrueba: PRECIO_PRUEBA,
    };
  }
  if (faltanBlazers) {
    corregidos = {
      ...corregidos,
      products: conBlazers(corregidos.products),
      blazersAgregados: BLAZERS_AGREGADOS,
    };
  }
  if (faltanFotosBlazers) {
    corregidos = {
      ...corregidos,
      products: conFotosDeBlazers(corregidos.products),
      fotosBlazers: FOTOS_BLAZERS,
    };
  }
  if (faltanFotosCeleste) {
    corregidos = {
      ...corregidos,
      products: conFotosDelCeleste(corregidos.products),
      fotosCeleste: FOTOS_CELESTE_PUESTAS,
    };
  }

  // Si la escritura falla, se devuelven igual los datos corregidos: es
  // mejor enseñar el stock de verdad y volver a intentarlo en la
  // siguiente visita que enseñar uno inventado.
  await writeStore(corregidos);
  return corregidos;
}

// Devuelve false si no se pudo guardar (disco de solo lectura y sin KV).
async function writeStore(data: StoreData): Promise<boolean> {
  data.updatedAt = new Date().toISOString();
  return writeDoc("store", data);
}

// ---- Lectura de productos -------------------------------------------

// Por defecto solo devuelve los activos (visibles en la tienda) y con los
// descuentos vigentes ya aplicados al precio. El panel pasa { raw: true }
// para ver/editar los PRECIOS BASE (sin descuento).
export async function getProducts(opts?: {
  includeInactive?: boolean;
  raw?: boolean;
}): Promise<Product[]> {
  const { products } = await readStore();
  const list = opts?.includeInactive
    ? products
    : products.filter((p) => p.active !== false);
  if (opts?.raw) return list;
  return applyDiscounts(list);
}

export async function getProductBySlug(
  slug: string,
  opts?: { raw?: boolean }
): Promise<Product | undefined> {
  const { products } = await readStore();
  const product = products.find((p) => p.slug === slug);
  if (!product || opts?.raw) return product;
  return withDiscount(product, await getLiveRules());
}

export async function getProductById(
  id: string,
  opts?: { raw?: boolean }
): Promise<Product | undefined> {
  const { products } = await readStore();
  const product = products.find((p) => p.id === id);
  if (!product || opts?.raw) return product;
  return withDiscount(product, await getLiveRules());
}

// ---- Escritura de productos -----------------------------------------

// Crea o actualiza un producto (según si el id ya existe).
export async function upsertProduct(product: Product): Promise<Product> {
  const data = await readStore();
  const idx = data.products.findIndex((p) => p.id === product.id);
  if (idx >= 0) {
    data.products[idx] = product;
  } else {
    data.products.push(product);
  }
  await writeStore(data);
  return product;
}

export async function deleteProduct(id: string): Promise<void> {
  const data = await readStore();
  data.products = data.products.filter((p) => p.id !== id);
  await writeStore(data);
}

// Devuelve un id nuevo (el mayor numérico + 1).
export async function nextProductId(): Promise<string> {
  const { products } = await readStore();
  const max = products.reduce((m, p) => {
    const n = parseInt(p.id, 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return String(max + 1);
}

// ---- Inventario / stock ---------------------------------------------

// Ajusta el stock de una variante (delta puede ser negativo).
export async function adjustStock(
  productId: string,
  sku: string,
  delta: number
): Promise<void> {
  const data = await readStore();
  const product = data.products.find((p) => p.id === productId);
  const variant = product?.variants.find((v) => v.sku === sku);
  if (variant) {
    variant.stock = Math.max(0, variant.stock + delta);
    await writeStore(data);
  }
}

// Descuenta de una vez el stock de un pedido entero.
//
// De una vez a propósito: hacerlo producto por producto son varias
// lecturas y escrituras del inventario, y entre una y otra se cuela
// cualquier otra compra. Devuelve lo que NO se pudo servir, para que
// quien llama decida (aquí: no se crea el pedido).
export type Faltante = {
  productId: string;
  sku: string;
  nombre: string;
  pedidas: number;
  disponibles: number;
};

export async function descontarStock(
  items: Array<{ productId: string; sku?: string; name: string; qty: number }>
): Promise<{ ok: boolean; faltantes: Faltante[] }> {
  const data = await readStore();
  const faltantes: Faltante[] = [];

  // Primero se comprueba TODO y solo después se descuenta: así un pedido
  // de tres cosas no deja dos descontadas y una sin servir.
  const aDescontar: Array<{ variante: { stock: number }; qty: number }> = [];
  const pedidoPorSku = new Map<string, number>();

  for (const item of items) {
    if (!item.sku) continue;
    pedidoPorSku.set(item.sku, (pedidoPorSku.get(item.sku) ?? 0) + item.qty);
  }

  for (const [sku, qty] of pedidoPorSku) {
    const item = items.find((i) => i.sku === sku)!;
    const producto = data.products.find((p) => p.id === item.productId);
    const variante = producto?.variants.find((v) => v.sku === sku);

    if (!variante || variante.stock < qty) {
      faltantes.push({
        productId: item.productId,
        sku,
        nombre: item.name,
        pedidas: qty,
        disponibles: variante?.stock ?? 0,
      });
      continue;
    }
    aDescontar.push({ variante, qty });
  }

  if (faltantes.length > 0) return { ok: false, faltantes };

  for (const { variante, qty } of aDescontar) variante.stock -= qty;
  await writeStore(data);
  return { ok: true, faltantes: [] };
}

// Devuelve al inventario lo que tenía reservado un pedido.
export async function devolverStock(
  items: Array<{ productId: string; sku?: string; qty: number }>
): Promise<void> {
  const data = await readStore();
  let tocado = false;

  for (const item of items) {
    if (!item.sku) continue;
    const producto = data.products.find((p) => p.id === item.productId);
    const variante = producto?.variants.find((v) => v.sku === item.sku);
    if (variante) {
      variante.stock += item.qty;
      tocado = true;
    }
  }

  if (tocado) await writeStore(data);
}

// Fija el stock de una variante a un valor exacto.
export async function setStock(
  productId: string,
  sku: string,
  value: number
): Promise<void> {
  const data = await readStore();
  const product = data.products.find((p) => p.id === productId);
  const variant = product?.variants.find((v) => v.sku === sku);
  if (variant) {
    variant.stock = Math.max(0, Math.floor(value));
    await writeStore(data);
  }
}

// Lista plana de todas las variantes (para la tabla de inventario).
export type InventoryRow = {
  productId: string;
  productName: string;
  slug: string;
  size: string;
  sku: string;
  stock: number;
  active: boolean;
};

export async function getInventory(): Promise<InventoryRow[]> {
  const { products } = await readStore();
  const rows: InventoryRow[] = [];
  for (const p of products) {
    for (const v of p.variants) {
      rows.push({
        productId: p.id,
        productName: p.name,
        slug: p.slug,
        size: v.size,
        sku: v.sku,
        stock: v.stock,
        active: p.active !== false,
      });
    }
  }
  return rows;
}
