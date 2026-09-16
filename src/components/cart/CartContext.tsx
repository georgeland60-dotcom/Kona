"use client";

// Maneja el estado del carrito en todo el sitio.
// Guarda el carrito en el navegador (localStorage) para que no se pierda al recargar.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Product, totalStock } from "@/lib/types";

export type CartItem = {
  product: Product;
  qty: number;
  size?: string;
};

// Lo que responde el servidor al preciar el carrito. Con promociones que
// dependen del carrito entero (lleva 3 y te llevas 15%), el navegador ya
// no puede calcular el total sumando: tiene que preguntar.
export type LineaPreciada = {
  productId: string;
  size?: string;
  nombre: string;
  qty: number;
  pedida: number; // lo que se pidió (puede ser más de lo que hay)
  disponible: number; // unidades que quedan
  precioLista: number;
  precioUnitario: number;
  subtotalLista: number;
  subtotal: number;
  ahorro: number;
  regaladas: number; // unidades gratis o rebajadas por un 2x1
  precios: number[];
  preciosFinales: number[];
  promo?: string;
};

// Un descuento sobre el total de la compra ("10% si llevas la cartera
// verde, tope S/ 85"). No baja el precio de ninguna línea: baja el total.
export type DescuentoCarrito = {
  nombre: string;
  monto: number;
  tope?: number;
  topeAplicado: boolean;
};

export type PrecioCarrito = {
  lineas: LineaPreciada[];
  totalLista: number;
  subtotal: number; // suma de las líneas, antes del descuento de carrito
  total: number;
  ahorro: number;
  promos: string[];
  descuentoCarrito?: DescuentoCarrito;
};

type CartContextType = {
  items: CartItem[];
  add: (product: Product, size?: string) => void;
  remove: (id: string, size?: string) => void;
  setQty: (id: string, qty: number, size?: string) => void;
  clear: () => void;
  count: number;
  total: number;
  precio: PrecioCarrito | null; // null mientras no ha respondido el servidor
  calculando: boolean;
  isOpen: boolean;
  setOpen: (v: boolean) => void;
};

// Identifica un carrito por su contenido: si cambia algo, cambia la firma.
function firmaDe(items: CartItem[]): string {
  return JSON.stringify(items.map((i) => [i.product.id, i.size ?? "", i.qty]));
}

// Cuántas unidades hay de esa talla. El carrito guardado en el navegador
// puede traer un stock viejo, así que esto es solo para no dejar pedir un
// disparate: quien manda es el servidor, que recalcula al preciar.
function disponibleDe(product: Product, size?: string): number {
  if (!size) return totalStock(product);
  return product.variants.find((v) => v.size === size)?.stock ?? 0;
}

const CartContext = createContext<CartContextType | null>(null);
const STORAGE_KEY = "tienda-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setOpen] = useState(false);
  // Guardamos el precio JUNTO CON el carrito al que corresponde. Así se
  // sabe si está al día sin tener que llevar otro estado aparte.
  const [precioState, setPrecioState] = useState<{
    firma: string;
    datos: PrecioCarrito;
  } | null>(null);

  // Al cargar la pagina, recupera el carrito guardado
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // si algo falla, empezamos con carrito vacio
    }
  }, []);

  // Cada vez que cambia el carrito, lo guardamos
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const add = (product: Product, size?: string) => {
    const tope = disponibleDe(product, size);
    setItems((prev) => {
      const idx = prev.findIndex(
        (i) => i.product.id === product.id && i.size === size
      );
      if (idx >= 0) {
        const copy = [...prev];
        // No pasar del stock: pedir 5 de lo que hay 3 solo sirve para
        // decepcionar a la clienta en el último paso.
        copy[idx] = {
          ...copy[idx],
          qty: Math.min(copy[idx].qty + 1, Math.max(1, tope)),
        };
        return copy;
      }
      return [...prev, { product, qty: 1, size }];
    });
    setOpen(true);
  };

  const remove = (id: string, size?: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.product.id === id && i.size === size))
    );
  };

  const setQty = (id: string, qty: number, size?: string) => {
    if (qty <= 0) return remove(id, size);
    setItems((prev) =>
      prev.map((i) => {
        if (i.product.id !== id || i.size !== size) return i;
        const tope = Math.max(1, disponibleDe(i.product, i.size));
        return { ...i, qty: Math.min(qty, tope) };
      })
    );
  };

  const clear = () => setItems([]);

  const count = items.reduce((sum, i) => sum + i.qty, 0);

  // Le preguntamos al servidor cuánto cuesta cada vez que cambia el carrito.
  useEffect(() => {
    // Con el carrito vacío no hay nada que preguntar. No hace falta borrar
    // el precio guardado: más abajo se ignora cuando no hay items.
    if (items.length === 0) return;
    const firma = firmaDe(items);
    let cancelado = false;
    fetch("/api/cart/price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({
          productId: i.product.id,
          size: i.size,
          qty: i.qty,
        })),
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PrecioCarrito | null) => {
        // Si mientras respondía el carrito volvió a cambiar, esta respuesta
        // ya no vale: la descartamos en vez de pintar un precio viejo.
        if (cancelado || !data) return;
        setPrecioState({ firma, datos: data });

        // El servidor sabe el stock de verdad. Si recortó alguna línea
        // (el carrito guardado traía un stock viejo, o alguien compró
        // antes), se ajusta el carrito para que lo que se ve sea lo que
        // se va a cobrar.
        const recortadas = data.lineas.filter((l) => l.qty < l.pedida);
        if (recortadas.length > 0) {
          setItems((prev) =>
            prev
              .map((i) => {
                const linea = recortadas.find(
                  (l) => l.productId === i.product.id && l.size === i.size
                );
                return linea ? { ...i, qty: linea.qty } : i;
              })
              .filter((i) => i.qty > 0)
          );
        }
      })
      .catch(() => {
        // Sin conexión seguimos mostrando el último precio conocido.
      });
    return () => {
      cancelado = true;
    };
  }, [items]);

  // El carrito vacío no tiene precio, y "está calculando" es simplemente
  // que el precio guardado todavía no corresponde a este carrito. Ambas
  // cosas se deducen, así que el efecto no necesita tocar el estado.
  const precioActual = items.length === 0 ? null : (precioState?.datos ?? null);
  const calculando = items.length > 0 && precioState?.firma !== firmaDe(items);

  // Mientras el servidor responde mostramos la suma simple, para que no
  // aparezca un cero ni una pantalla en blanco.
  const total =
    precioActual?.total ??
    items.reduce((sum, i) => sum + i.product.price * i.qty, 0);

  return (
    <CartContext.Provider
      value={{
        items, add, remove, setQty, clear, count, total,
        precio: precioActual, calculando, isOpen, setOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// Pequeno atajo para usar el carrito desde cualquier componente
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
