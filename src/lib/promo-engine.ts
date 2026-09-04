// =============================================================
//  MOTOR DE PROMOCIONES
//
//  Recibe el CARRITO COMPLETO y devuelve cuánto cuesta cada línea.
//  Los precios no se pueden calcular producto por producto: para saber
//  si aplica un "lleva 3 y te llevas 15%" o un 2x1 hay que mirar todo
//  lo que lleva el cliente.
//
//  Este archivo es una función PURA a propósito (recibe productos y
//  reglas, no los busca). Así se puede probar de verdad, sin depender
//  de la base de datos, que es lo mínimo cuando se trata de dinero.
//
//  Decisiones tomadas con la dueña:
//   - CADA UNIDAD RECIBE COMO MÁXIMO UNA PROMOCIÓN. Nunca se apilan:
//     gana la que más le conviene al cliente. Apilar es la forma más
//     común de terminar vendiendo por debajo del costo.
//   - En un 2x1 se regala la unidad MÁS BARATA (es lo que ya hacían en
//     WooCommerce, y lo que espera el cliente).
//   - Se redondea a soles enteros, para que el total sea siempre la
//     suma exacta de las líneas.
//   - El precio anterior viaja siempre, para mostrarlo tachado.
//   - Los descuentos DE CARRITO ("10% de toda tu compra si llevas X, con
//     tope de S/ 85") son otra cosa: no bajan el precio de un producto,
//     bajan el total. Se calculan al final, sobre el subtotal YA
//     descontado (nunca sobre el precio de lista), y con tope. Es la
//     dirección conservadora: descuentan menos, no más.
// =============================================================

import type {
  CondicionCarrito,
  DiscountRule,
  Product,
  Tramo,
} from "@/lib/types";

export type LineaPedida = {
  productId: string;
  sku?: string;
  size?: string;
  qty: number;
};

export type LineaPreciada = {
  productId: string;
  sku?: string;
  size?: string;
  nombre: string;
  qty: number;
  precioLista: number; // por unidad, sin ninguna promoción
  precioUnitario: number; // el más bajo que se paga en esta línea
  subtotalLista: number; // lo que costaría sin promociones
  subtotal: number; // lo que se cobra
  ahorro: number;
  regaladas: number; // unidades que salieron gratis o rebajadas por un 2x1
  // El precio de CADA unidad, de mayor a menor. En un 2x1 la línea tiene
  // unidades a precios distintos (una a 115 y otra a 0), así que un solo
  // "precio unitario" no alcanza para cobrar bien.
  precios: number[];
  // Los mismos precios pero ya con el descuento de carrito repartido.
  // Se separan a propósito: la línea se MUESTRA con su precio (el
  // descuento de carrito se muestra aparte, como una rebaja al total),
  // pero se COBRA con estos, para que la suma cuadre al céntimo.
  preciosFinales: number[];
  promo?: string; // la promoción que actuó, para mostrarla
};

// Un descuento aplicado al total de la compra.
export type DescuentoCarrito = {
  nombre: string;
  monto: number; // soles de rebaja sobre el subtotal
  tope?: number; // el máximo configurado, si tenía
  topeAplicado: boolean; // true = el tope recortó el descuento
};

export type CarritoPreciado = {
  lineas: LineaPreciada[];
  totalLista: number;
  subtotal: number; // suma de las líneas, ANTES del descuento de carrito
  total: number; // lo que se cobra de verdad
  ahorro: number;
  promos: string[];
  descuentoCarrito?: DescuentoCarrito;
};

// ---- Utilidades ------------------------------------------------------

function aplicar(kind: DiscountRule["kind"], value: number, base: number): number {
  if (kind === "percent") return base * (1 - value / 100);
  if (kind === "precio_fijo") return value; // "todos a S/ 89"
  return base - value;
}

// Entero y nunca por debajo de 1 sol... salvo un regalo, que sí puede ser 0.
function redondear(precio: number, permitirCero = false): number {
  const r = Math.round(precio);
  return permitirCero ? Math.max(0, r) : Math.max(1, r);
}

function vigente(regla: DiscountRule, ahora: Date): boolean {
  if (!regla.active) return false;
  if (regla.startsAt && ahora < new Date(regla.startsAt)) return false;
  if (regla.endsAt && ahora > new Date(regla.endsAt)) return false;
  return true;
}

// ---- A qué productos apunta una regla -------------------------------

export function aplicaAlProducto(regla: DiscountRule, producto: Product): boolean {
  const f = regla.filtro;

  // Sin filtro, el comportamiento de siempre (scope + target).
  if (!f) {
    if (regla.scope === "all") return true;
    if (regla.scope === "category") return producto.category === regla.target;
    if (regla.scope === "product") return producto.id === regla.target;
    return false;
  }

  // Las exclusiones mandan: un producto excluido nunca entra, aunque lo
  // incluya todo lo demás. Es como se arman las campañas de verdad
  // ("60% en todo MENOS estos dos").
  if (f.excluirProductos?.includes(producto.id)) return false;
  if (f.excluirCategorias?.includes(producto.category)) return false;

  if (f.todos) return true;
  if (f.productos?.includes(producto.id)) return true;
  if (f.categorias?.includes(producto.category)) return true;
  return false;
}

// El tramo que corresponde a una cantidad. Si varios encajan (tramos mal
// armados), gana el de mayor "desde": es el que se quiso para la cantidad
// más alta.
export function tramoPara(tramos: Tramo[], cantidad: number): Tramo | undefined {
  return tramos
    .filter((t) => cantidad >= t.desde && (t.hasta === undefined || cantidad <= t.hasta))
    .sort((a, b) => b.desde - a.desde)[0];
}

// Cuántas unidades cuentan para un escalonado: todas las que caen dentro
// del alcance de la regla. "Lleva 3 blusas" suma todas las blusas del
// carrito aunque sean modelos y tallas distintas.
function cantidadRelevante(
  regla: DiscountRule,
  lineas: LineaPedida[],
  productos: Map<string, Product>
): number {
  return lineas.reduce((suma, l) => {
    const p = productos.get(l.productId);
    return p && aplicaAlProducto(regla, p) ? suma + l.qty : suma;
  }, 0);
}

// ---- Descuentos de carrito ------------------------------------------

// Reparte un descuento del total entre las unidades que lo generaron.
//
// Hace falta porque el pedido (y Mercado Pago) se arman con precios por
// unidad: no admiten una línea negativa de "descuento". Se reparte en
// proporción a lo que vale cada unidad, en soles enteros, y el resto que
// deja el redondeo va a las que quedaron más cerca de subir. Así la suma
// de las unidades es EXACTAMENTE el monto descontado, ni un sol más.
export function repartirDescuento(precios: number[], monto: number): number[] {
  const cero = precios.map(() => 0);
  const suma = precios.reduce((a, b) => a + b, 0);
  if (monto <= 0 || suma <= 0) return cero;

  const aRepartir = Math.min(Math.round(monto), suma);
  const exactos = precios.map((p) => (p * aRepartir) / suma);
  const partes = exactos.map((e) => Math.floor(e));
  let resto = aRepartir - partes.reduce((a, b) => a + b, 0);

  const porResiduo = exactos
    .map((e, i) => ({ i, residuo: e - Math.floor(e) }))
    .sort((a, b) => b.residuo - a.residuo || a.i - b.i);

  for (const { i } of porResiduo) {
    if (resto <= 0) break;
    if (partes[i] < precios[i]) {
      partes[i] += 1;
      resto -= 1;
    }
  }
  return partes;
}

// ¿Se cumple la condición para que aplique un descuento de carrito?
// Todo lo que se haya pedido tiene que cumplirse a la vez.
function cumpleCondicion(
  condicion: CondicionCarrito | undefined,
  lineas: Array<{ producto: Product; qty: number }>,
  subtotal: number
): boolean {
  if (!condicion) return true;

  const { productos, categorias, cantidadMinima, subtotalMinimo } = condicion;

  if (subtotalMinimo !== undefined && subtotal < subtotalMinimo) return false;

  const pideAlgo = !!productos?.length || !!categorias?.length;
  if (pideAlgo) {
    const unidades = lineas.reduce(
      (suma, l) =>
        productos?.includes(l.producto.id) ||
        categorias?.includes(l.producto.category)
          ? suma + l.qty
          : suma,
      0
    );
    return unidades >= Math.max(1, cantidadMinima ?? 1);
  }

  if (cantidadMinima !== undefined) {
    const unidades = lineas.reduce((suma, l) => suma + l.qty, 0);
    return unidades >= cantidadMinima;
  }

  return true;
}

// ---- El cálculo ------------------------------------------------------

// Una unidad suelta del carrito. Trabajamos unidad por unidad porque un
// 2x1 regala UNA de las tres que lleva el cliente, no la línea entera.
type Unidad = {
  linea: number; // a qué línea pertenece
  precioLista: number;
  precio: number; // lo que se paga por ella
  promo?: string;
  regalada: boolean;
};

export function preciarCarrito(
  lineas: LineaPedida[],
  productos: Product[],
  reglas: DiscountRule[],
  ahora: Date = new Date()
): CarritoPreciado {
  const porId = new Map(productos.map((p) => [p.id, p]));
  const vigentes = reglas.filter((r) => vigente(r, ahora));

  // Solo las líneas que existen de verdad y piden algo.
  const validas = lineas
    .map((l, i) => ({ l, i, producto: porId.get(l.productId) }))
    .filter((x) => x.producto && x.l.qty > 0);

  // ---- Paso 1: descuentos por unidad (simple y escalonado) ----------
  const unidades: Unidad[] = [];
  validas.forEach(({ l, producto }, idx) => {
    const precioLista = producto!.price;
    let mejor = precioLista;
    let promo: string | undefined;

    for (const regla of vigentes) {
      if (regla.tipo === "bogo") continue; // van en el paso 2
      if (regla.tipo === "carrito") continue; // van en el paso 4
      if (!aplicaAlProducto(regla, producto!)) continue;

      let candidato: number | undefined;
      if (regla.tipo === "escalonado") {
        const tramo = tramoPara(
          regla.tramos ?? [],
          cantidadRelevante(regla, validas.map((v) => v.l), porId)
        );
        if (tramo) candidato = aplicar(tramo.kind, tramo.value, precioLista);
      } else {
        candidato = aplicar(regla.kind, regla.value, precioLista);
      }

      if (candidato !== undefined && candidato < mejor) {
        mejor = candidato;
        promo = regla.name;
      }
    }

    const precio = redondear(mejor);
    for (let u = 0; u < l.qty; u++) {
      unidades.push({ linea: idx, precioLista, precio, promo, regalada: false });
    }
  });

  // ---- Paso 2: los 2x1 ----------------------------------------------
  // Un 2x1 se aplica sobre PRECIOS DE LISTA y reemplaza a los otros
  // descuentos en sus unidades. Si se dejara encima de un descuento ya
  // aplicado, un "60% en todo" más un 2x1 daría 80% de rebaja efectiva
  // sin que nadie lo haya decidido.
  //
  // Así que se comparan los dos escenarios y gana el que más le convenga
  // al cliente, que es la regla que acordamos: nunca dos promos sobre la
  // misma unidad, ni sumadas por la puerta de atrás.
  for (const regla of vigentes) {
    if (regla.tipo !== "bogo" || !regla.bogo) continue;
    const { porCada, regala, descuentoRegalo, recursivo, maximoRegalos } = regla.bogo;
    if (porCada < 1 || regala < 1) continue;

    const elegibles = unidades.filter((u) => {
      if (u.regalada) return false; // ya la tomó otro 2x1
      const producto = porId.get(validas[u.linea].l.productId);
      return producto ? aplicaAlProducto(regla, producto) : false;
    });

    if (elegibles.length < porCada) continue;

    const bloques = recursivo ? Math.floor(elegibles.length / porCada) : 1;
    let aRegalar = bloques * regala;
    if (maximoRegalos !== undefined) aRegalar = Math.min(aRegalar, maximoRegalos);
    if (aRegalar < 1) continue;

    // Se regalan las MÁS BARATAS (por precio de lista, que es sobre el
    // que se calcula este escenario).
    const porPrecio = [...elegibles].sort((a, b) => a.precioLista - b.precioLista);
    const regaladas = new Set(porPrecio.slice(0, aRegalar));

    const precioConBogo = (u: Unidad) =>
      !regaladas.has(u)
        ? u.precioLista
        : descuentoRegalo >= 100
          ? 0
          : redondear(u.precioLista * (1 - descuentoRegalo / 100), true);

    const conBogo = elegibles.reduce((s, u) => s + precioConBogo(u), 0);
    const comoEsta = elegibles.reduce((s, u) => s + u.precio, 0);

    // Si al cliente le conviene más lo que ya tenía, no tocamos nada.
    if (conBogo >= comoEsta) continue;

    for (const u of elegibles) {
      u.precio = precioConBogo(u);
      u.promo = regla.name;
      if (regaladas.has(u)) u.regalada = true;
    }
  }

  // ---- Paso 3: descuentos sobre el TOTAL de la compra ---------------
  // "Si llevan la cartera verde, 10% de toda la compra con tope de S/ 85".
  // No baja el precio de ningún producto: baja el total. Se calcula sobre
  // lo que ya quedó después de los descuentos de arriba, así que en el
  // peor de los casos descuenta de menos, nunca de más.
  //
  // Si hay varias promociones de carrito aplicables, se aplica UNA SOLA:
  // la que más le conviene al cliente. Sumarlas es la forma rápida de
  // regalar el carrito entero sin que nadie lo haya decidido.
  const subtotal = unidades.reduce((s, u) => s + u.precio, 0);
  const enCarrito = validas.map(({ l, producto }) => ({
    producto: producto!,
    qty: l.qty,
  }));

  let elegida:
    | { regla: DiscountRule; monto: number; indices: number[]; topeAplicado: boolean }
    | undefined;

  for (const regla of vigentes) {
    if (regla.tipo !== "carrito") continue;
    if (regla.kind === "precio_fijo") continue; // no tiene sentido sobre un total
    if (!cumpleCondicion(regla.carrito?.condicion, enCarrito, subtotal)) continue;

    // Sobre qué parte de la compra se calcula. Por defecto, todo.
    const indices: number[] = [];
    unidades.forEach((u, i) => {
      if (u.precio <= 0) return; // una unidad de regalo ya no puede bajar más
      const producto = porId.get(validas[u.linea].l.productId);
      if (producto && aplicaAlProducto(regla, producto)) indices.push(i);
    });

    const base = indices.reduce((s, i) => s + unidades[i].precio, 0);
    if (base <= 0) continue;

    const bruto = regla.kind === "percent" ? (base * regla.value) / 100 : regla.value;
    const tope = regla.carrito?.maximoDescuento;
    const conTope = tope !== undefined ? Math.min(bruto, tope) : bruto;
    // Nunca más que la propia compra: el total no puede quedar negativo.
    const monto = Math.min(Math.round(conTope), base);
    if (monto < 1) continue;

    if (!elegida || monto > elegida.monto) {
      elegida = {
        regla,
        monto,
        indices,
        topeAplicado: tope !== undefined && conTope < bruto,
      };
    }
  }

  // El descuento del total se reparte entre las unidades que lo generaron,
  // porque el pedido se cobra unidad por unidad.
  const rebajaPorUnidad = unidades.map(() => 0);
  let descuentoCarrito: DescuentoCarrito | undefined;

  if (elegida) {
    const partes = repartirDescuento(
      elegida.indices.map((i) => unidades[i].precio),
      elegida.monto
    );
    elegida.indices.forEach((i, k) => {
      rebajaPorUnidad[i] = partes[k];
    });
    descuentoCarrito = {
      nombre: elegida.regla.name,
      // El monto real repartido, no el teórico: es lo que se descuenta.
      monto: partes.reduce((a, b) => a + b, 0),
      tope: elegida.regla.carrito?.maximoDescuento,
      topeAplicado: elegida.topeAplicado,
    };
  }

  // ---- Paso 4: volver a juntar las unidades en líneas ---------------
  const preciadas: LineaPreciada[] = validas.map(({ l, producto }, idx) => {
    const mias: number[] = [];
    unidades.forEach((u, i) => {
      if (u.linea === idx) mias.push(i);
    });
    const subtotalLinea = mias.reduce((s, i) => s + unidades[i].precio, 0);
    const subtotalLista = producto!.price * l.qty;
    const regaladas = mias.filter((i) => unidades[i].regalada).length;
    const conPromo = mias.map((i) => unidades[i]).find((u) => u.promo);

    return {
      productId: producto!.id,
      sku: l.sku,
      size: l.size,
      nombre: producto!.name,
      qty: l.qty,
      precioLista: producto!.price,
      // Lo que cuesta una unidad normal (la regalada se muestra aparte).
      precioUnitario: Math.max(...mias.map((i) => unidades[i].precio)),
      precios: mias.map((i) => unidades[i].precio).sort((a, b) => b - a),
      preciosFinales: mias
        .map((i) => unidades[i].precio - rebajaPorUnidad[i])
        .sort((a, b) => b - a),
      subtotalLista,
      subtotal: subtotalLinea,
      ahorro: subtotalLista - subtotalLinea,
      regaladas,
      promo: subtotalLinea < subtotalLista ? conPromo?.promo : undefined,
    };
  });

  const sumaLineas = preciadas.reduce((s, l) => s + l.subtotal, 0);
  const total = sumaLineas - (descuentoCarrito?.monto ?? 0);
  const totalLista = preciadas.reduce((s, l) => s + l.subtotalLista, 0);
  const promos = [
    ...new Set(
      [
        ...preciadas.map((l) => l.promo),
        descuentoCarrito?.nombre,
      ].filter(Boolean)
    ),
  ] as string[];

  return {
    lineas: preciadas,
    totalLista,
    subtotal: sumaLineas,
    total,
    ahorro: totalLista - total,
    promos,
    ...(descuentoCarrito ? { descuentoCarrito } : {}),
  };
}
