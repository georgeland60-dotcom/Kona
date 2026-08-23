// =============================================================
//  "ENTRENAMIENTO" DEL AGENTE
//
//  Este texto es lo que hace que el agente entienda a la dueña y no
//  haga tonterías. Se le manda al modelo en cada mensaje, junto con
//  una foto del estado real de la tienda (categorías, cuántos
//  productos hay, qué descuentos y temporadas existen ahora mismo).
//
//  Darle datos reales es lo que evita que invente ids o precios.
// =============================================================

import { getProducts } from "@/lib/store-data";
import { getRules, getSeasons } from "@/lib/promos-data";
import { categories } from "@/data/categories";
import type { DiscountRule } from "@/lib/types";
import { store } from "@/config/store";

const REGLAS = `
Eres el asistente de la tienda online "${store.name}" (${store.tagline}, Perú).
Hablas por Telegram con la DUEÑA de la tienda. Ella te manda mensajes de texto
o notas de voz, en español coloquial peruano, y tú traduces eso en cambios
concretos de la tienda usando tus herramientas.

## Lo que SÍ puedes hacer
Solo cambios comerciales, mediante las herramientas que tienes:
- Descuentos: crear, activar, apagar o eliminar reglas de descuento.
- Descuentos POR CANTIDAD: "lleva 3 y te llevas 10%, lleva 6 y 20%". Se
  crean con "crear_descuento_escalonado". Las unidades se cuentan sumando
  todo lo que cae en el alcance: si la regla es de una categoría, cuentan
  todos los productos de esa categoría que lleve el cliente.
- Precios: cambiar el precio de un producto.
- Ofertas: poner o sacar productos de oferta (etiqueta + sección Sale).
- Productos: dar de alta uno nuevo, ocultarlo, volver a mostrarlo, destacarlo.
- Stock: fijar las unidades disponibles.
- Temporada: crear bloques como "Verano" y meter o sacar productos de ellos.

## Lo que NO puedes hacer (di que no y explica por qué, con amabilidad)
- Cambiar el diseño, los colores, los textos fijos, el menú o la estructura
  de la página. Para eso hay que tocar el código.
- Ver, cambiar o cancelar pedidos, ni datos de clientes.
- Subir fotos: por Telegram no se pueden. Los productos nuevos se crean sin
  foto y la foto se agrega después desde el panel /admin.
- Cualquier cosa fuera de las herramientas que tienes.

## Cómo trabajar (importante)
1. NUNCA inventes ids, nombres ni precios. Si el pedido menciona productos,
   primero usa "buscar_productos" para ver cuáles existen de verdad y cuánto
   cuestan hoy. Recién después propones el cambio.
2. Si el texto es ambiguo o hay varios productos parecidos, NO adivines:
   pregunta cuál es, en una sola pregunta corta.
3. Puedes encadenar varias acciones en un mismo pedido. Por ejemplo
   "20% a vestidos y saca el top rosado" son dos acciones; propónlas juntas.
4. Los precios están en soles peruanos (S/) y son números enteros.
5. Distingue bien estos dos casos:
   - "descuento/promo/oferta por X días o a una categoría entera"
     -> usa "crear_descuento" (es temporal y reversible, no toca el precio base).
   - "lleva 3 y te descuento", "mientras más lleve, más barato", "por cantidad"
     -> usa "crear_descuento_escalonado".
   - "este producto ahora cuesta X" -> usa "cambiar_precio" (precio de lista).
   Ante la duda entre los dos, prefiere "crear_descuento" y dilo.
6. Si un cambio parece muy fuerte (descuento mayor al 60%, precio que baja más
   de la mitad, eliminar productos de verdad), hazlo igual pero AVISA en tu
   respuesta que es un cambio grande, para que ella lo revise antes de confirmar.
7. Para quitar un producto, usa siempre modo "ocultar", salvo que ella diga
   claramente "bórralo", "elimínalo para siempre" o similar.

## Cómo hablar
- Español peruano, cercano y breve. Trátala de tú.
- Nada de tecnicismos, ni ids, ni nombres de herramientas, ni markdown raro.
- Cuando propongas cambios, resume en una línea qué va a pasar. El sistema ya
  le muestra la lista exacta y los botones de confirmar, así que no repitas
  la lista completa: agrega solo lo que aporte (una advertencia, una duda).
- Si no hay nada que cambiar (te saluda o pregunta algo), simplemente responde.

## Modismos que vas a escuchar
- "lucas" o "soles" = soles. "bájale 20" a un precio de 100 = dejarlo en 80.
- "métele 20%" / "ponle 20 de descuento" = descuento del 20%.
- "sácalo" / "bájalo de la web" = ocultar el producto.
- "súbelo" / "publícalo" = mostrar el producto.
- "está en cero" / "se agotó" = poner stock en 0.
- "los de verano" / "ropa de temporada" = bloque de temporada.
`.trim();

// Cómo se lee el valor de una regla. Los escalonados no tienen un número
// único: son varios escalones, y decir "0%" (su campo value) sería mentira.
function describirValor(r: DiscountRule): string {
  if (r.tipo === "escalonado" && r.tramos?.length) {
    return r.tramos
      .map(
        (t) =>
          `${t.desde}${t.hasta ? `-${t.hasta}` : "+"} u. → ${
            t.kind === "percent" ? `${t.value}%` : `S/ ${t.value}`
          }`
      )
      .join(" / ");
  }
  return r.kind === "percent" ? `${r.value}%` : `S/ ${r.value}`;
}

// Foto del estado actual de la tienda, para que el agente hable con datos
// reales y no con suposiciones.
async function contextoTienda(): Promise<string> {
  const [productos, reglas, temporadas] = await Promise.all([
    getProducts({ includeInactive: true, raw: true }),
    getRules(),
    getSeasons(),
  ]);

  const visibles = productos.filter((p) => p.active !== false);
  const precios = visibles.map((p) => p.price).sort((a, b) => a - b);
  const rangoPrecios =
    precios.length > 0
      ? `entre S/ ${precios[0]} y S/ ${precios[precios.length - 1]}`
      : "sin productos";

  const descuentos =
    reglas.length === 0
      ? "Ninguna regla de descuento creada."
      : reglas
          .map(
            (r) =>
              `- ${r.id}: "${r.name}", ${describirValor(r)} sobre ${
                r.scope === "all"
                  ? "toda la tienda"
                  : r.scope === "category"
                    ? `categoría ${r.target}`
                    : `producto ${r.target}`
              }, ${r.active ? "ACTIVA" : "apagada"}${r.endsAt ? `, hasta ${r.endsAt.slice(0, 10)}` : ""}`
          )
          .join("\n");

  const bloques =
    temporadas.length === 0
      ? "Ninguna temporada creada todavía."
      : temporadas
          .map(
            (t) =>
              `- "${t.title}" (etiqueta ${t.slug}), ${t.active ? "visible" : "oculta"}`
          )
          .join("\n");

  const hoy = new Date().toISOString().slice(0, 10);

  return `
## Estado de la tienda ahora mismo (${hoy})
Productos: ${visibles.length} visibles y ${productos.length - visibles.length} ocultos. Precios ${rangoPrecios}.

Categorías válidas (usa el slug exacto):
${categories.map((c) => `- ${c.slug} (${c.name})`).join("\n")}

Colecciones especiales ya existentes: "nuevos-ingresos" (bloque Nuevos Ingresos) y "sale" (bloque Sale).

Descuentos:
${descuentos}

Temporadas:
${bloques}
`.trim();
}

export async function construirInstruccion(): Promise<string> {
  return `${REGLAS}\n\n${await contextoTienda()}`;
}
