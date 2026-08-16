import Link from "next/link";
import { getProducts } from "@/lib/store-data";
import { categories } from "@/data/categories";
import { homeCollections } from "@/data/collections";
import { getSeasonBySlug } from "@/lib/promos-data";
import ProductGrid from "@/components/product/ProductGrid";

export default async function TiendaPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;

  const products = await getProducts();
  // el filtro acepta tanto categorías como colecciones transversales
  // (ej. "nuevos-ingresos", "sale"), que viven en el campo collections.
  const filtrados = cat
    ? products.filter(
        (p) => p.category === cat || (p.collections ?? []).includes(cat)
      )
    : products;

  // El título puede venir de una categoría, de una colección fija del
  // inicio o de un bloque de temporada creado desde el agente.
  const coleccionActual = homeCollections.find((c) => c.slug === cat);
  const temporadaActual = cat ? await getSeasonBySlug(cat) : undefined;
  const categoriaActual =
    categories.find((c) => c.slug === cat) ??
    (coleccionActual
      ? { slug: coleccionActual.slug, name: coleccionActual.title }
      : temporadaActual
        ? { slug: temporadaActual.slug, name: temporadaActual.title }
        : undefined);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="font-script text-5xl text-accent mb-1">
          {categoriaActual ? categoriaActual.name : "Tienda"}
        </h1>
        <p className="text-muted text-sm">
          {filtrados.length} producto{filtrados.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filtros por categoria */}
      <div className="flex flex-wrap justify-center gap-2 mb-12">
        <Link
          href="/tienda"
          className={`px-4 py-1.5 rounded-full text-sm border transition ${
            !cat
              ? "bg-foreground text-background border-foreground"
              : "border-line hover:border-foreground"
          }`}
        >
          Todo
        </Link>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/tienda?cat=${c.slug}`}
            className={`px-4 py-1.5 rounded-full text-sm border transition ${
              cat === c.slug
                ? "bg-foreground text-background border-foreground"
                : "border-line hover:border-foreground"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      <ProductGrid products={filtrados} />
    </div>
  );
}
