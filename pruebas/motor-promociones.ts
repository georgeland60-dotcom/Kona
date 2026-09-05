// =============================================================
//  PRUEBAS DEL MOTOR DE PROMOCIONES
//
//  Se corren sin instalar nada:
//      node --experimental-strip-types pruebas/motor-promociones.ts
//
//  Aquí se prueba el dinero: que el total que ve la clienta sea
//  exactamente el que se cobra, que los topes recorten, y que dos
//  promociones no se sumen por la puerta de atrás.
// =============================================================

import {
  preciarCarrito,
  precioVitrina,
  repartirDescuento,
} from "../src/lib/promo-engine.ts";
import type { DiscountRule, Product } from "../src/lib/types.ts";

let fallos = 0;
function ok(nombre: string, cond: boolean, extra: unknown = "") {
  if (!cond) { fallos++; console.log("FALLA:", nombre, extra); }
  else console.log("ok  ", nombre);
}

const P = (id: string, name: string, price: number, category: string): Product => ({
  id, slug: id, name, price, category, variants: [{ size: "U", sku: id + "-U", stock: 10 }],
});

const bag = P("p1", "Ribbon Bag Verde", 115, "carteras");
const jean = P("p2", "Jean Wide", 189, "jeans");
const top = P("p3", "Top Rosado", 79, "blusas");
const productos = [bag, jean, top];

const reglaCarrito = (extra: Partial<DiscountRule> = {}): DiscountRule => ({
  id: "r1", name: "PROMO BAG", scope: "all", kind: "percent", value: 10, active: true,
  tipo: "carrito",
  carrito: { condicion: { productos: ["p1"] }, maximoDescuento: 85 },
  ...extra,
});

// 1. La condición no se cumple: no descuenta nada.
let r = preciarCarrito([{ productId: "p2", qty: 1 }], productos, [reglaCarrito()]);
ok("sin el producto condicionante no aplica", r.total === 189 && !r.descuentoCarrito, r);

// 2. Se cumple: 10% de (115+189)=304 -> 30
r = preciarCarrito([{ productId: "p1", qty: 1 }, { productId: "p2", qty: 1 }], productos, [reglaCarrito()]);
ok("aplica 10% al total", r.subtotal === 304 && r.descuentoCarrito?.monto === 30 && r.total === 274, r);
ok("ahorro coincide", r.ahorro === r.totalLista - r.total, r);

// 3. El tope recorta: compra grande
r = preciarCarrito([{ productId: "p1", qty: 1 }, { productId: "p2", qty: 10 }], productos, [reglaCarrito()]);
const bruto = (115 + 1890) * 0.1; // 200.5
ok("el tope de 85 recorta", r.descuentoCarrito?.monto === 85 && r.descuentoCarrito?.topeAplicado === true, { bruto, r: r.descuentoCarrito });
ok("total con tope", r.total === 115 + 1890 - 85, r.total);

// 4. La suma de preciosFinales es exactamente el total.
const suma = r.lineas.reduce((s, l) => s + l.preciosFinales.reduce((a, b) => a + b, 0), 0);
ok("preciosFinales suman el total cobrado", suma === r.total, { suma, total: r.total });

// 5. Las líneas mostradas siguen mostrando su precio (sin el descuento de carrito).
ok("las líneas no cambian de precio", r.lineas[0].subtotal === 115 && r.lineas[1].subtotal === 1890, r.lineas.map(l => l.subtotal));

// 6. Sobre precios YA descontados, no sobre lista.
const cyber: DiscountRule = { id: "r0", name: "CYBER 50", scope: "all", kind: "percent", value: 50, active: true };
r = preciarCarrito([{ productId: "p1", qty: 1 }, { productId: "p2", qty: 1 }], productos, [cyber, reglaCarrito()]);
// 58 (115/2 redondeado) + 95 (189/2=94.5->95) = 153 ; 10% = 15.3 -> 15
ok("se calcula sobre el subtotal ya descontado", r.subtotal === 153 && r.descuentoCarrito?.monto === 15 && r.total === 138, r);

// 7. Dos reglas de carrito: aplica solo la mejor.
const otra = reglaCarrito({ id: "r2", name: "PROMO 5", value: 5, carrito: { condicion: { productos: ["p1"] } } });
r = preciarCarrito([{ productId: "p1", qty: 1 }, { productId: "p2", qty: 1 }], productos, [reglaCarrito(), otra]);
ok("solo aplica una regla de carrito, la mejor", r.descuentoCarrito?.nombre === "PROMO BAG" && r.descuentoCarrito?.monto === 30, r.descuentoCarrito);

// 8. Monto fijo, y nunca más que la compra.
const fija = reglaCarrito({ id: "r3", name: "MENOS 500", kind: "fixed", value: 500, carrito: { condicion: { productos: ["p1"] } } });
r = preciarCarrito([{ productId: "p1", qty: 1 }], productos, [fija]);
ok("el descuento nunca supera la compra", r.total === 0 && r.descuentoCarrito?.monto === 115, r);

// 9. Cantidad mínima.
const min3 = reglaCarrito({ id: "r4", name: "3 CARTERAS", carrito: { condicion: { categorias: ["carteras"], cantidadMinima: 3 } } });
r = preciarCarrito([{ productId: "p1", qty: 2 }], productos, [min3]);
ok("con 2 unidades no llega", !r.descuentoCarrito, r.descuentoCarrito);
r = preciarCarrito([{ productId: "p1", qty: 3 }], productos, [min3]);
ok("con 3 unidades sí", r.descuentoCarrito?.monto === 35, r.descuentoCarrito); // 345*0.1=34.5 -> 35

// 10. Subtotal mínimo.
const min500 = reglaCarrito({ id: "r5", name: "COMPRA 500", carrito: { condicion: { subtotalMinimo: 500 } } });
r = preciarCarrito([{ productId: "p2", qty: 2 }], productos, [min500]);
ok("378 no llega a 500", !r.descuentoCarrito, r.descuentoCarrito);
r = preciarCarrito([{ productId: "p2", qty: 3 }], productos, [min500]);
ok("567 sí llega", r.descuentoCarrito?.monto === 57, r.descuentoCarrito);

// 11. Con un 2x1: la unidad regalada no recibe descuento de carrito.
const bogo: DiscountRule = { id: "rb", name: "2x1 carteras", scope: "all", kind: "percent", value: 0, active: true,
  tipo: "bogo", bogo: { porCada: 2, regala: 1, descuentoRegalo: 100, recursivo: true }, filtro: { categorias: ["carteras"] } };
r = preciarCarrito([{ productId: "p1", qty: 2 }, { productId: "p2", qty: 1 }], productos, [bogo, reglaCarrito()]);
// paga 115 + 0 + 189 = 304 ; 10% = 30.4 -> 30
ok("2x1 + descuento de carrito", r.subtotal === 304 && r.descuentoCarrito?.monto === 30 && r.total === 274, r);
const finales = r.lineas[0].preciosFinales;
ok("la unidad regalada sigue en 0", finales.includes(0), finales);
const suma2 = r.lineas.reduce((s, l) => s + l.preciosFinales.reduce((a, b) => a + b, 0), 0);
ok("suma exacta con 2x1", suma2 === r.total, { suma2, total: r.total });

// 12. Reparto: suma exacta y nada negativo.
for (const monto of [1, 7, 33, 85, 100]) {
  const partes = repartirDescuento([115, 189, 79], monto);
  const s = partes.reduce((a, b) => a + b, 0);
  ok(`reparto exacto de ${monto}`, s === monto && partes.every((x, i) => x >= 0 && x <= [115,189,79][i]), partes);
}

// 13. Regla de carrito acotada a una categoría: base = solo esa categoría.
const soloJeans = reglaCarrito({ id: "r6", name: "10% JEANS", filtro: { categorias: ["jeans"] }, carrito: { condicion: { productos: ["p1"] } } });
r = preciarCarrito([{ productId: "p1", qty: 1 }, { productId: "p2", qty: 1 }], productos, [soloJeans]);
ok("la base respeta el filtro", r.descuentoCarrito?.monto === 19, r.descuentoCarrito); // 189*0.1=18.9 -> 19

// 14. Regla inactiva o fuera de fecha.
r = preciarCarrito([{ productId: "p1", qty: 1 }], productos, [reglaCarrito({ active: false })]);
ok("inactiva no aplica", !r.descuentoCarrito, r.descuentoCarrito);
r = preciarCarrito([{ productId: "p1", qty: 1 }], productos, [reglaCarrito({ endsAt: "2020-01-01T00:00:00.000Z" })]);
ok("vencida no aplica", !r.descuentoCarrito, r.descuentoCarrito);

// 15. Carrito sin nada relacionado -> no rompe.
r = preciarCarrito([], productos, [reglaCarrito()]);
ok("carrito vacío", r.total === 0 && !r.descuentoCarrito, r);

// ---- Precio de vitrina (lo que se ve en el catálogo) ----------------
// Lo que se MUESTRA tiene que salir del mismo cálculo que lo que se
// COBRA. Aquí se comprueba justamente eso.

// 16. Una regla para UN producto no puede rebajar toda la tienda.
const soloBag: DiscountRule = {
  id: "v1", name: "15% labiales", scope: "all", kind: "percent", value: 15,
  active: true, filtro: { productos: ["p1"] },
};
ok("la vitrina respeta el filtro (el elegido baja)", precioVitrina(bag, [soloBag]) === 98, precioVitrina(bag, [soloBag]));
ok("la vitrina respeta el filtro (los demás NO)", precioVitrina(jean, [soloBag]) === 189, precioVitrina(jean, [soloBag]));
ok("y coincide con lo que cobra el carrito", (() => {
  const r = preciarCarrito([{ productId: "p2", qty: 1 }], productos, [soloBag]);
  return r.total === precioVitrina(jean, [soloBag]);
})());

// 17. Exclusiones.
const todoMenos: DiscountRule = {
  id: "v2", name: "50% menos jeans", scope: "all", kind: "percent", value: 50,
  active: true, filtro: { todos: true, excluirProductos: ["p2"] },
};
ok("la exclusión manda en la vitrina", precioVitrina(jean, [todoMenos]) === 189 && precioVitrina(bag, [todoMenos]) === 58, [precioVitrina(jean, [todoMenos]), precioVitrina(bag, [todoMenos])]);

// 18. Un 2x1 y un descuento del total NO se pintan como precio rebajado.
ok("el 2x1 no cambia el precio de vitrina", precioVitrina(bag, [bogo]) === 115, precioVitrina(bag, [bogo]));
ok("el descuento del total tampoco", precioVitrina(bag, [reglaCarrito()]) === 115, precioVitrina(bag, [reglaCarrito()]));

// 19. Precio fijo: deja el producto en ese precio, no le resta.
const fijo: DiscountRule = {
  id: "v3", name: "todo a 59", scope: "all", kind: "precio_fijo", value: 59, active: true,
};
ok("precio fijo se muestra como tal", precioVitrina(jean, [fijo]) === 59, precioVitrina(jean, [fijo]));

// 20. Por cantidad: no se muestra rebajado si hace falta llevar varias.
const desde3: DiscountRule = {
  id: "v4", name: "3+ 20%", scope: "all", kind: "percent", value: 0, active: true,
  tipo: "escalonado", tramos: [{ desde: 3, kind: "percent", value: 20 }],
};
ok("el escalonado no se pinta con una sola unidad", precioVitrina(jean, [desde3]) === 189, precioVitrina(jean, [desde3]));

// 21. Regla apagada o vencida.
ok("apagada no se muestra", precioVitrina(bag, [{ ...soloBag, active: false }]) === 115);

console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLAS`);
