import Link from "next/link";
import { getProducts } from "@/lib/store-data";
import { getCategorias } from "@/lib/categorias-data";
import RuleForm from "@/components/admin/RuleForm";

export default async function NuevoDescuentoPage() {
  const [products, categorias] = await Promise.all([
    getProducts({ includeInactive: true, raw: true }),
    getCategorias(),
  ]);
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
      <RuleForm categories={categorias} products={options} />
    </div>
  );
}
