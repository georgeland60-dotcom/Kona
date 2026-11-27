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
  // El "antes" por unidad, como lo tacha la tienda, solo si se cobró
  // menos.
  precioAntes?: number;
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
  // Cuánto se ahorró en total frente a los precios de antes.
  ahorro: number;
};

export async function resumenDelPedido(o: Order): Promise<ResumenPedido> {
  const { products } = await readStore();
  const porId = new Map(products.map((p) => [p.id, p]));

  const resumen: Omit<ResumenPedido, "ahorro"> = {
    id: o.id,
    fecha: o.createdAt,
    estado: o.status,
    lineas: o.items.map((i) => {
      const p = porId.get(i.productId);
      // Igual que la tienda: el "antes" es el que se haya puesto a mano
      // (oldPrice) o el de lista sin promociones.
      const antes = Math.max(p?.oldPrice ?? 0, i.priceLista ?? 0);
      return {
        nombre: i.name,
        ...(i.size ? { talla: i.size } : {}),
        cantidad: i.qty,
        precio: i.price,
        ...(antes > i.price ? { precioAntes: antes } : {}),
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
  const ahorro = resumen.lineas.reduce(
    (s, l) => s + (l.precioAntes ? (l.precioAntes - l.precio) * l.cantidad : 0),
    0
  );
  return { ...resumen, ahorro: Math.round(ahorro * 100) / 100 };
}
