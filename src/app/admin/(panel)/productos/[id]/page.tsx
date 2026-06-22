import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductById } from "@/lib/store-data";
import { categories } from "@/data/categories";
import ProductForm from "@/components/admin/ProductForm";

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id, { raw: true });
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
      <ProductForm product={product} categories={categories} />
    </div>
  );
}
