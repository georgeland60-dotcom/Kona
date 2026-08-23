// =============================================================
//  PRECIO DEL CARRITO
//
//  El carrito del navegador le pregunta aquí cuánto cuesta lo que
//  lleva. Antes lo sumaba él solo, pero con promociones que dependen
//  del carrito entero (lleva 3 y te llevas 15%) eso ya no alcanza.
//
//  Y sobre todo: así lo que se MUESTRA sale del mismo cálculo que lo
//  que se COBRA. No hay forma de que se separen.
// =============================================================

import { preciarPedido } from "@/lib/pricing";

type Entrada = {
  items?: Array<{ productId: string; sku?: string; size?: string; qty: number }>;
};

export async function POST(req: Request) {
  let body: Entrada;
  try {
    body = (await req.json()) as Entrada;
  } catch {
    return Response.json({ error: "pedido ilegible" }, { status: 400 });
  }

  const items = body.items ?? [];
  if (items.length === 0) {
    return Response.json({
      lineas: [],
      total: 0,
      totalLista: 0,
      ahorro: 0,
      promos: [],
    });
  }

  // Un carrito absurdamente largo solo puede ser un intento de tumbar el
  // servidor; lo cortamos en vez de ponernos a calcular.
  if (items.length > 100) {
    return Response.json({ error: "carrito demasiado grande" }, { status: 400 });
  }

  return Response.json(await preciarPedido(items));
}
