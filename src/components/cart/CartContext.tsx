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
import { Product } from "@/lib/types";

export type CartItem = {
  product: Product;
  qty: number;
  size?: string;
};

type CartContextType = {
  items: CartItem[];
  add: (product: Product, size?: string) => void;
  remove: (id: string, size?: string) => void;
  setQty: (id: string, qty: number, size?: string) => void;
  clear: () => void;
  count: number;
  total: number;
  isOpen: boolean;
  setOpen: (v: boolean) => void;
};

const CartContext = createContext<CartContextType | null>(null);
const STORAGE_KEY = "tienda-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setOpen] = useState(false);

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
    setItems((prev) => {
      const idx = prev.findIndex(
        (i) => i.product.id === product.id && i.size === size
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
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
      prev.map((i) =>
        i.product.id === id && i.size === size ? { ...i, qty } : i
      )
    );
  };

  const clear = () => setItems([]);

  const count = items.reduce((sum, i) => sum + i.qty, 0);
  const total = items.reduce((sum, i) => sum + i.product.price * i.qty, 0);

  return (
    <CartContext.Provider
      value={{ items, add, remove, setQty, clear, count, total, isOpen, setOpen }}
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
