import Link from "next/link";
import { getProducts } from "@/lib/store-data";
import { categories } from "@/data/categories";
import RuleForm from "@/components/admin/RuleForm";

export default async function NuevoDescuentoPage() {
  const products = await getProducts({ includeInactive: true, raw: true });
  const options = products.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div>
      <Link
        href="/admin/descuentos"
        className="text-sm text-muted hover:text-accent"
      >
        ← Descuentos
      </Link>
      <h1 className="text-2xl font-semibold mt-2 mb-6">Nuevo descuento</h1>
      <RuleForm categories={categories} products={options} />
    </div>
  );
}
