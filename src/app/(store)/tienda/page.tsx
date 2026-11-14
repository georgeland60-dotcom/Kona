import Link from "next/link";
import { getProducts } from "@/lib/store-data";
import { getCategorias } from "@/lib/categorias-data";
import { homeCollections } from "@/data/collections";
import { getSeasonBySlug, getLiveRules } from "@/lib/promos-data";
import { descuentosPorCategoria } from "@/lib/descuentos-por-categoria";
import { CintaDescuento } from "@/components/promo/Campana";
import ProductGrid from "@/components/product/ProductGrid";

export default async function TiendaPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;

  const [products, categorias, rules] = await Promise.all([
    getProducts(),
    getCategorias(),
    getLiveRules(),
  ]);
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
    categorias.find((c) => c.slug === cat) ??
    (coleccionActual
      ? { slug: coleccionActual.slug, name: coleccionActual.title }
      : temporadaActual
        ? { slug: temporadaActual.slug, name: temporadaActual.title }
        : undefined);

  // Si la categoria que se abre tiene descuento vigente, lo primero
  // que se ve es la cinta. Sale de las reglas y del stock reales.
  const oferta = cat ? descuentosPorCategoria(rules, products).get(cat) : undefined;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {oferta && (
        <CintaDescuento
          etiqueta={oferta.etiqueta}
          categoria={categoriaActual?.name ?? "esta seleccion"}
        />
      )}

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
        {categorias.map((c) => (
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
