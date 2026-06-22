import Link from "next/link";
import { notFound } from "next/navigation";
import { getProducts, getProductBySlug } from "@/lib/store-data";
import { categories } from "@/data/categories";
import { formatPrice } from "@/lib/format";
import AddToCartButton from "@/components/product/AddToCartButton";
import ProductGrid from "@/components/product/ProductGrid";
import TrackView from "@/components/TrackView";

// Genera las paginas de cada producto de antemano (mas rapido)
export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product || product.active === false) notFound();

  const categoria = categories.find((c) => c.slug === product.category);
  const relacionados = (await getProducts())
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <TrackView type="product" id={product.id} />
      {/* Migas de pan */}
      <nav className="text-xs text-muted mb-8">
        <Link href="/" className="hover:text-accent">
          Inicio
        </Link>{" "}
        /{" "}
        <Link href="/tienda" className="hover:text-accent">
          Tienda
        </Link>{" "}
        / <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Foto */}
        <div className="aspect-[3/4] placeholder-box rounded-xl overflow-hidden">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-6 text-center">
              <span className="font-script text-4xl text-accent/70">
                {product.name}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {categoria && (
            <Link
              href={`/tienda?cat=${categoria.slug}`}
              className="text-xs uppercase tracking-wide text-accent-dark"
            >
              {categoria.name}
            </Link>
          )}
          <h1 className="text-3xl font-medium mt-2 mb-4">{product.name}</h1>

          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">{formatPrice(product.price)}</span>
            {product.oldPrice && (
              <span className="text-muted line-through">
                {formatPrice(product.oldPrice)}
              </span>
            )}
          </div>

          {product.description && (
            <p className="text-muted leading-relaxed mb-8">
              {product.description}
            </p>
          )}

          <AddToCartButton product={product} />

          <div className="mt-8 text-sm text-muted space-y-1">
            <p>· Envios a todo Lima</p>
            <p>· Cambios hasta 7 dias despues de la compra</p>
            <p>· Pago seguro</p>
          </div>
        </div>
      </div>

      {/* Relacionados */}
      {relacionados.length > 0 && (
        <section className="mt-24">
          <h2 className="font-script text-4xl text-accent mb-8 text-center">
            Tambien te puede gustar
          </h2>
          <ProductGrid products={relacionados} />
        </section>
      )}
    </div>
  );
}
