import Link from "next/link";
import { categories } from "@/data/categories";
import ProductForm from "@/components/admin/ProductForm";

export default function NuevoProductoPage() {
  return (
    <div>
      <Link
        href="/admin/productos"
        className="text-sm text-muted hover:text-accent"
      >
        ← Productos
      </Link>
      <h1 className="text-2xl font-semibold mt-2 mb-6">Nuevo producto</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
