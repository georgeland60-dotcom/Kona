// =============================================================
//  MOTOR DE PROMOCIONES
//
//  Recibe el CARRITO COMPLETO y devuelve cuánto cuesta cada línea.
//  Hasta ahora los precios se calculaban producto por producto, en
//  aislamiento; eso alcanza para un "20% en vestidos", pero no para un
//  "lleva 3 y te llevas 15%": para saber si aplica hay que contar
//  cuántas unidades hay en el carrito.
//
//  Este archivo es una función PURA a propósito (recibe productos y
//  reglas, no los busca). Así se puede probar de verdad, sin depender
//  de la base de datos, que es lo mínimo cuando se trata de dinero.
//
//  Decisiones tomadas con la dueña:
//   - Las promociones NO se apilan: gana la que más le conviene al
//     cliente. Apilar es la forma más común de vender bajo costo.
//   - Se redondea a soles enteros, sobre el precio POR UNIDAD, para que
//     el total siempre sea la suma de las partes.
//   - El precio anterior viaja siempre, para poder mostrarlo tachado.
// =============================================================

import type { DiscountRule, Product, Tramo } from "@/lib/types";

// Lo que entra: qué pidió el cliente.
export type LineaPedida = {
  productId: string;
  sku?: string;
  size?: string;
  qty: number;
};

// Lo que sale: qué se cobra por cada línea y por qué.
export type LineaPreciada = {
  productId: string;
  sku?: string;
  size?: string;
  nombre: string;
  qty: number;
  precioLista: number; // por unidad, sin ninguna promoción
  precioUnitario: number; // por unidad, ya con la promoción
  subtotalLista: number; // lo que costaría sin promociones
  subtotal: number; // lo que se cobra
  ahorro: number;
  promo?: string; // nombre de la promoción que ganó, para mostrarlo
};

export type CarritoPreciado = {
  lineas: LineaPreciada[];
  totalLista: number;
  total: number;
  ahorro: number;
  promos: string[]; // las promociones que participaron, sin repetir
};

// ---- Utilidades ------------------------------------------------------

// Precio que deja una regla sobre un precio base.
function aplicar(kind: "percent" | "fixed", value: number, base: number): number {
  return kind === "percent" ? base * (1 - value / 100) : base - value;
}

// Nunca por debajo de 1 sol, y siempre entero.
function redondear(precio: number): number {
  return Math.max(1, Math.round(precio));
}

function vigente(regla: DiscountRule, ahora: Date): boolean {
  if (!regla.active) return false;
  if (regla.startsAt && ahora < new Date(regla.startsAt)) return false;
  if (regla.endsAt && ahora > new Date(regla.endsAt)) return false;
  return true;
}

function aplicaAlProducto(regla: DiscountRule, producto: Product): boolean {
  if (regla.scope === "all") return true;
  if (regla.scope === "category") return producto.category === regla.target;
  if (regla.scope === "product") return producto.id === regla.target;
  return false;
}

// El tramo que corresponde a una cantidad. Si hay varios que encajan
// (tramos mal armados, solapados), gana el de mayor "desde": es el que la
// dueña quiso para la cantidad más alta.
export function tramoPara(tramos: Tramo[], cantidad: number): Tramo | undefined {
  return tramos
    .filter((t) => cantidad >= t.desde && (t.hasta === undefined || cantidad <= t.hasta))
    .sort((a, b) => b.desde - a.desde)[0];
}

// ---- Cuántas unidades cuentan para un escalonado --------------------
//  Depende del alcance de la regla: "lleva 3 blusas" cuenta todas las
//  blusas del carrito, aunque sean modelos y tallas distintas. Contar
//  solo por línea haría que 2 blusas M + 1 L no calificaran, que es
//  justo lo que la dueña esperaría que sí.

function cantidadRelevante(
  regla: DiscountRule,
  producto: Product,
  lineas: LineaPedida[],
  productos: Map<string, Product>
): number {
  return lineas.reduce((suma, l) => {
    const p = productos.get(l.productId);
    if (!p) return suma;
    if (regla.scope === "all") return suma + l.qty;
    if (regla.scope === "category")
      return p.category === regla.target ? suma + l.qty : suma;
    return p.id === producto.id ? suma + l.qty : suma;
  }, 0);
}

// ---- El cálculo ------------------------------------------------------

export function preciarCarrito(
  lineas: LineaPedida[],
  productos: Product[],
  reglas: DiscountRule[],
  ahora: Date = new Date()
): CarritoPreciado {
  const porId = new Map(productos.map((p) => [p.id, p]));
  const vigentes = reglas.filter((r) => vigente(r, ahora));

  const preciadas: LineaPreciada[] = [];

  for (const linea of lineas) {
    const producto = porId.get(linea.productId);
    // Un producto que ya no existe simplemente no se cobra.
    if (!producto || linea.qty <= 0) continue;

    const precioLista = producto.price;
    let mejorPrecio = precioLista;
    let mejorPromo: string | undefined;

    for (const regla of vigentes) {
      if (!aplicaAlProducto(regla, producto)) continue;

      let candidato: number | undefined;

      if (regla.tipo === "escalonado") {
        const cantidad = cantidadRelevante(regla, producto, lineas, porId);
        const tramo = tramoPara(regla.tramos ?? [], cantidad);
        if (tramo) candidato = aplicar(tramo.kind, tramo.value, precioLista);
      } else {
        // Sin tipo, o "simple": el comportamiento de siempre.
        candidato = aplicar(regla.kind, regla.value, precioLista);
      }

      // No se apilan: nos quedamos con la que más conviene al cliente.
      if (candidato !== undefined && candidato < mejorPrecio) {
        mejorPrecio = candidato;
        mejorPromo = regla.name;
      }
    }

    const precioUnitario = redondear(mejorPrecio);
    const subtotal = precioUnitario * linea.qty;
    const subtotalLista = precioLista * linea.qty;

    preciadas.push({
      productId: producto.id,
      sku: linea.sku,
      size: linea.size,
      nombre: producto.name,
      qty: linea.qty,
      precioLista,
      precioUnitario,
      subtotalLista,
      subtotal,
      ahorro: subtotalLista - subtotal,
      // Solo anunciamos la promo si de verdad bajó el precio.
      promo: precioUnitario < precioLista ? mejorPromo : undefined,
    });
  }

  const total = preciadas.reduce((s, l) => s + l.subtotal, 0);
  const totalLista = preciadas.reduce((s, l) => s + l.subtotalLista, 0);
  const promos = [...new Set(preciadas.map((l) => l.promo).filter(Boolean))] as string[];

  return { lineas: preciadas, totalLista, total, ahorro: totalLista - total, promos };
}
