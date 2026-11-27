import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProducts, getProductBySlug } from "@/lib/store-data";
import { getCategorias } from "@/lib/categorias-data";
import { formatPrice } from "@/lib/format";
import { esTallaUnica } from "@/lib/tallas";
import AddToCartButton from "@/components/product/AddToCartButton";
import GuiaTallas from "@/components/product/GuiaTallas";
import PreguntarTalla from "@/components/product/PreguntarTalla";
import ProductGallery from "@/components/product/ProductGallery";
import { CintaDescuento } from "@/components/promo/Campana";
import ProductGrid from "@/components/product/ProductGrid";
import TrackView from "@/components/TrackView";

// Separa la descripción en viñetas (los textos vienen con guiones "-" como
// puntos). Si no hay guiones, devuelve un solo bloque.
function toBullets(desc: string): string[] {
  return desc
    .split(/(?:^|\s)[-–•]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Lo que se ve al compartir una prenda por WhatsApp o Instagram, y lo
// que lee Google. Sin esto, los 84 enlaces que ya estaban indexados de
// la tienda anterior aterrizaban en una página con el título genérico
// de la tienda y sin foto, que es tirar a la basura lo que ya tenía
// ganado konamoda.pe.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const descripcion =
    product.description?.replace(/\s*-\s*/g, " · ").trim().slice(0, 160) ||
    `${product.name} · ${formatPrice(product.price)}. Envíos a todo Lima y provincias.`;

  return {
    title: product.name,
    description: descripcion,
    alternates: { canonical: `/producto/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.name,
      description: descripcion,
      url: `/producto/${product.slug}`,
      ...(product.image ? { images: [{ url: product.image }] } : {}),
    },
  };
}

// Genera las paginas de cada producto de antemano (mas rapido)
// Las fichas se generan de antemano, y el panel las regenera al guardar
// un descuento. Pero un descuento también termina SOLO, por su fecha, y
// entonces nadie guarda nada: la ficha seguía con el precio rebajado (y
// la cinta de "50% OFF") mientras el carrito ya cobraba el precio
// entero. Con esto se rehacen como mucho cada minuto: siguen siendo
// rápidas y nunca se quedan más de un minuto atrás del carrito.
export const revalidate = 60;

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

  const categoria = (await getCategorias()).find(
    (c) => c.slug === product.category
  );
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

      {/* grid-cols-1 no es decorativo: sin el, en celular la columna
          es "auto", o sea del ancho del contenido, y la tira de
          miniaturas (10 fotos = 748 px) estiraba la pagina entera.
          grid-cols-1 la define como minmax(0,1fr), que si se deja
          encoger hasta el ancho de la pantalla. */}
      {/* Lo primero al entrar: el descuento que tiene ESTA prenda, con su
          campana. Sale de la regla que se le aplica, igual que la cinta
          de la foto, así que en una prenda sin descuento no aparece. */}
      {product.descuentoPct ? (
        <CintaDescuento
          titulo={
            product.lemaCampana
              ? `${product.lemaCampana} · descuento especial`
              : "Descuento activo"
          }
          etiqueta={`${product.descuentoPct}% OFF`}
          categoria="esta prenda"
        />
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Galería de fotos */}
        <ProductGallery
          descuentoPct={product.descuentoPct}
          lemaCampana={product.lemaCampana}
          images={
            product.images && product.images.length > 0
              ? product.images
              : product.image
              ? [product.image]
              : []
          }
          name={product.name}
        />

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

          {product.description &&
            (() => {
              const bullets = toBullets(product.description);
              return bullets.length > 1 ? (
                <ul className="text-muted leading-relaxed mb-8 space-y-1.5 list-disc pl-5">
                  {bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted leading-relaxed mb-8">
                  {product.description}
                </p>
              );
            })()}

          <AddToCartButton product={product} />

          <PreguntarTalla tallaUnica={esTallaUnica(product)} />

          <GuiaTallas product={product} />

          <div className="mt-8 text-sm text-muted space-y-1">
            <p>· Envíos a todo Lima</p>
            <p>· Cambios hasta 7 días después de la compra</p>
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
