"use client";

import { useState } from "react";
import Link from "next/link";
import { Product, totalStock } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/components/cart/CartContext";

export default function QuickView({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
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
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-background rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto grid md:grid-cols-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-3 right-3 z-10 text-2xl leading-none bg-background/80 rounded-full w-9 h-9 flex items-center justify-center"
        >
          ×
        </button>

        <div className="aspect-[3/4] placeholder-box md:rounded-l-xl overflow-hidden">
          {product.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        <div className="p-6 flex flex-col">
          <h2 className="text-xl font-medium">{product.name}</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-lg text-accent">
              {formatPrice(product.price)}
            </span>
            {product.oldPrice && (
              <span className="text-sm text-muted line-through">
                {formatPrice(product.oldPrice)}
              </span>
            )}
          </div>

          {product.description && (
            <p className="text-sm text-muted mt-3 leading-relaxed">
              {product.description}
            </p>
          )}

          {hasSizes && (
            <div className="mt-5">
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
                      className={`min-w-10 h-10 px-3 border rounded-full text-sm transition ${
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

          <div className="mt-auto pt-6 space-y-3">
            <button
              onClick={handleAdd}
              disabled={agotado}
              className="w-full bg-foreground text-background py-3 rounded-full font-medium hover:bg-accent transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-foreground"
            >
              {agotado ? "Agotado" : "Agregar al carrito"}
            </button>
            <Link
              href={`/producto/${product.slug}`}
              className="block text-center text-sm text-muted underline"
            >
              Ver detalle completo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
