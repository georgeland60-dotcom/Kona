import Link from "next/link";
import { notFound } from "next/navigation";
import { getRuleById } from "@/lib/promos-data";
import { getProducts } from "@/lib/store-data";
import { categories } from "@/data/categories";
import RuleForm from "@/components/admin/RuleForm";

export default async function EditarDescuentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [rule, products] = await Promise.all([
    getRuleById(id),
    getProducts({ includeInactive: true, raw: true }),
  ]);
  if (!rule) notFound();
  const options = products.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div>
      <Link
        href="/admin/descuentos"
        className="text-sm text-muted hover:text-accent"
      >
        ← Descuentos
      </Link>
      <h1 className="text-2xl font-semibold mt-2 mb-6">Editar descuento</h1>
      <RuleForm rule={rule} categories={categories} products={options} />
    </div>
  );
}
