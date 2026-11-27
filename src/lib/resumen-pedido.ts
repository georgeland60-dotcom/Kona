// =============================================================
//  EL RESUMEN QUE VE LA CLIENTA DESPUÉS DE PAGAR
//
//  Número de pedido, qué compró (con foto, talla, cantidad y precio),
//  cómo le llega y el total. Sale del pedido GUARDADO, no del carrito
//  del navegador: es lo que de verdad se cobró.
//
//  El color no es un dato aparte en esta tienda: va en el nombre de la
//  prenda ("Slouchy Jean Cris Celeste").
// =============================================================

import { readStore } from "@/lib/store-data";
import type { Order } from "@/lib/types";

export type LineaResumen = {
  nombre: string;
  talla?: string;
  cantidad: number;
  precio: number; // unitario, el cobrado
  subtotal: number;
  imagen?: string;
  enlace?: string;
};

export type ResumenPedido = {
  id: string;
  fecha: string;
  estado: Order["status"];
  lineas: LineaResumen[];
  envio?: {
    recojo: boolean;
    destino: string;
    direccion?: string;
    costo: number;
    promo?: string;
  };
  total: number;
};

export async function resumenDelPedido(o: Order): Promise<ResumenPedido> {
  const { products } = await readStore();
  const porId = new Map(products.map((p) => [p.id, p]));

  return {
    id: o.id,
    fecha: o.createdAt,
    estado: o.status,
    lineas: o.items.map((i) => {
      const p = porId.get(i.productId);
      return {
        nombre: i.name,
        ...(i.size ? { talla: i.size } : {}),
        cantidad: i.qty,
        precio: i.price,
        subtotal: Math.round(i.price * i.qty * 100) / 100,
        ...(p?.image || p?.images?.[0] ? { imagen: p.image ?? p.images![0] } : {}),
        ...(p?.slug ? { enlace: `/producto/${p.slug}` } : {}),
      };
    }),
    ...(o.envio
      ? {
          envio: {
            recojo: !!o.envio.recojo,
            destino: o.envio.destino,
            ...(o.envio.direccion ? { direccion: o.envio.direccion } : {}),
            costo: o.envio.costo,
            ...(o.envio.promo ? { promo: o.envio.promo } : {}),
          },
        }
      : {}),
    total: o.total,
  };
}
