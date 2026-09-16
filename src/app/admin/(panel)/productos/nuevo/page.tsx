import Link from "next/link";
import { getCategorias } from "@/lib/categorias-data";
import ProductForm from "@/components/admin/ProductForm";

export default async function NuevoProductoPage() {
  const categorias = await getCategorias();
  return (
    <div>
      <Link
        href="/admin/productos"
        className="text-sm text-muted hover:text-accent"
      >
        ← Productos
      </Link>
      <h1 className="text-2xl font-semibold mt-2 mb-6">Nuevo producto</h1>
      <ProductForm categories={categorias} />
    </div>
  );
}
