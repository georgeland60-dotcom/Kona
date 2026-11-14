// =============================================================
//  QUE CATEGORIAS TIENEN DESCUENTO AHORA MISMO
//
//  Sirve para poner la campanita en el menu, en los cuadros del
//  inicio y arriba de la categoria. La regla de oro es la misma que
//  en el pop-up: NADA se inventa. Una categoria solo se marca si
//  existe de verdad una prenda suya, CON STOCK, a la que le aplica
//  una regla vigente del panel. Asi la campana y el carrito dicen lo
//  mismo.
//
//  El texto del gancho ("15% OFF", "2x1", "Envio gratis") sale de la
//  misma funcion que ya usa el pop-up, para que no se puedan separar.
// =============================================================

import { aplicaAlProducto, stockDisponible } from "@/lib/promo-engine";
import { gancho } from "@/lib/promos-display";
import type { DiscountRule, Product } from "@/lib/types";

export type DescuentoCategoria = {
  etiqueta: string; // lo que se lee: "15% OFF", "2x1", "Envio gratis"
  pct: number; // solo para elegir el mejor cuando hay varios
};

// Cuanto "pesa" una regla para quedarse con la mejor de la categoria.
// Un 2x1 no tiene porcentaje, pero vale mas que un 10%: se le da 50,
// que es el ahorro real de llevar dos y pagar una.
function peso(regla: DiscountRule): number {
  if (regla.tipo === "bogo" && regla.bogo) {
    const { porCada, regala, descuentoRegalo } = regla.bogo;
    if (porCada <= 0) return 0;
    return (regala / porCada) * descuentoRegalo;
  }
  if (regla.tipo === "escalonado" && regla.tramos?.length) {
    return Math.max(
      0,
      ...regla.tramos.filter((t) => t.kind === "percent").map((t) => t.value)
    );
  }
  if (regla.kind === "percent") return regla.value;
  // Un descuento en soles o un envio gratis no se pueden comparar con
  // un porcentaje, pero tampoco deben ganarle a uno grande.
  return 1;
}

// Una regla de TODA LA TIENDA no marca categorias.
//
// Medido en la tienda real: con un 15% sobre el total corriendo, la
// campana salia en 17 de 18 categorias. Una senal que esta en todas no
// senala nada, y el 2x1 de Vestidos -el que de verdad mueve- se perdia
// entre el resto. Un descuento de toda la tienda se anuncia UNA vez
// (el pop-up de bienvenida y el banner ya lo hacen); la campana queda
// para la categoria que tiene algo propio.
//
// No se oculta nada: el precio y el carrito siguen aplicando la regla
// igual. Lo que no se hace es repetirla categoria por categoria.
function esDeTodaLaTienda(regla: DiscountRule): boolean {
  if (regla.filtro) return regla.filtro.todos === true;
  return regla.scope === "all";
}

export function descuentosPorCategoria(
  reglas: DiscountRule[],
  productos: Product[]
): Map<string, DescuentoCategoria> {
  const mapa = new Map<string, DescuentoCategoria & { _peso: number }>();

  const anotar = (slug: string, regla: DiscountRule) => {
    if (!slug) return;
    const p = peso(regla);
    const previo = mapa.get(slug);
    if (previo && previo._peso >= p) return;
    mapa.set(slug, { etiqueta: gancho(regla), pct: p, _peso: p });
  };

  for (const regla of reglas) {
    if (esDeTodaLaTienda(regla)) continue;
    for (const prod of productos) {
      // Sin stock no hay promesa que cumplir.
      if (stockDisponible(prod) <= 0) continue;
      if (!aplicaAlProducto(regla, prod)) continue;
      // La prenda marca su categoria y tambien las colecciones a las
      // que pertenece ("sale", "nuevos-ingresos"), porque el menu y
      // los cuadros del inicio enlazan por las dos.
      anotar(prod.category, regla);
      for (const col of prod.collections ?? []) anotar(col, regla);
    }
  }

  const salida = new Map<string, DescuentoCategoria>();
  for (const [slug, v] of mapa) salida.set(slug, { etiqueta: v.etiqueta, pct: v.pct });
  return salida;
}
