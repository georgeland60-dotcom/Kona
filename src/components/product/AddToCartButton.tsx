"use client";

import { useState } from "react";
import { Product, totalStock } from "@/lib/types";
import { useCart } from "@/components/cart/CartContext";

export default function AddToCartButton({ product }: { product: Product }) {
  const { add } = useCart();
  const variants = product.variants ?? [];
  const hasSizes = variants.length > 0;
  const agotado = totalStock(product) <= 0;
  const [size, setSize] = useState<string | undefined>(undefined);
  const [error, setError] = useState(false);

  const handleAdd = () => {
    if (hasSizes && !size) {
      setError(true);
      return;
    }
    add(product, size);
  };

  return (
    <div className="space-y-4">
      {hasSizes && (
        <div>
          <p className="text-sm mb-2">Talla</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const sinStock = v.stock <= 0;
              return (
                <button
                  key={v.sku}
                  disabled={sinStock}
                  onClick={() => {
                    setSize(v.size);
                    setError(false);
                  }}
                  className={`min-w-11 h-11 px-3 border rounded-full text-sm transition ${
                    sinStock
                      ? "border-line text-muted line-through cursor-not-allowed opacity-50"
                      : size === v.size
                        ? "border-foreground bg-foreground text-background"
                        : "border-line hover:border-foreground"
                  }`}
                >
                  {v.size}
                </button>
              );
            })}
          </div>
          {error && (
            <p className="text-xs text-red-600 mt-2">
              Por favor elige una talla.
            </p>
          )}
        </div>
      )}

      <button
        onClick={handleAdd}
        disabled={agotado}
        className="w-full bg-foreground text-background py-3.5 rounded-full font-medium hover:bg-accent transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-foreground"
      >
        {agotado ? "Agotado" : "Agregar al carrito"}
      </button>
    </div>
  );
}
