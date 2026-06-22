"use client";

import Link from "next/link";
import { useState } from "react";
import { Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/components/cart/CartContext";
import QuickView from "@/components/product/QuickView";

export default function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const [quickView, setQuickView] = useState(false);

  return (
    <div className="group">
      <div className="relative aspect-[3/4] placeholder-box rounded-lg overflow-hidden">
        <Link href={`/producto/${product.slug}`} className="block w-full h-full">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-4 text-center">
              <span className="font-script text-2xl text-accent/70">
                {product.name}
              </span>
            </div>
          )}
        </Link>
        {product.onSale && (
          <span className="absolute top-3 left-3 bg-accent text-white text-xs px-2 py-1 rounded-full">
            Sale
          </span>
        )}
        <button
          onClick={() => setQuickView(true)}
          className="absolute bottom-0 left-0 right-0 bg-background/95 text-foreground text-xs uppercase tracking-wide py-2.5 translate-y-full group-hover:translate-y-0 transition duration-300 hover:text-accent"
        >
          Vista rápida
        </button>
      </div>

      {quickView && (
        <QuickView product={product} onClose={() => setQuickView(false)} />
      )}

      <div className="mt-3">
        <Link href={`/producto/${product.slug}`}>
          <h3 className="text-sm font-medium leading-snug hover:text-accent transition">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm">{formatPrice(product.price)}</span>
          {product.oldPrice && (
            <span className="text-xs text-muted line-through">
              {formatPrice(product.oldPrice)}
            </span>
          )}
        </div>
        <button
          onClick={() => add(product)}
          className="mt-3 w-full border border-foreground text-foreground text-xs uppercase tracking-wide py-2 rounded-full hover:bg-foreground hover:text-background transition"
        >
          Agregar
        </button>
      </div>
    </div>
  );
}
