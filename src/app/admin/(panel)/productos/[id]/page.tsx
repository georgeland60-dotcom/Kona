import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductById } from "@/lib/store-data";
import { getCategorias } from "@/lib/categorias-data";
import ProductForm from "@/components/admin/ProductForm";

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categorias] = await Promise.all([
    getProductById(id, { raw: true }),
    getCategorias(),
  ]);
  if (!product) notFound();

  return (
    <div>
      <Link
        href="/admin/productos"
        className="text-sm text-muted hover:text-accent"
      >
        ← Productos
      </Link>
      <h1 className="text-2xl font-semibold mt-2 mb-6">Editar producto</h1>
      <ProductForm product={product} categories={categorias} />
    </div>
  );
}
