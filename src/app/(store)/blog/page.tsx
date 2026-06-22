import type { Metadata } from "next";
import Link from "next/link";
import { store } from "@/config/store";

export const metadata: Metadata = {
  title: `Blog · ${store.name}`,
};

export default function Blog() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <h1 className="font-script text-5xl text-accent mb-4">Blog</h1>
      <p className="text-muted mb-8 leading-relaxed">
        Muy pronto compartiremos tips de moda, cuidados de prendas y novedades de
        temporada. ¡Vuelve a visitarnos!
      </p>
      <Link
        href="/tienda"
        className="inline-block bg-foreground text-background px-8 py-3 rounded-full hover:bg-accent transition"
      >
        Ir a la tienda
      </Link>
    </div>
  );
}
