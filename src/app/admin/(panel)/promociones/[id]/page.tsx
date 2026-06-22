import Link from "next/link";
import { notFound } from "next/navigation";
import { getBannerById } from "@/lib/promos-data";
import BannerForm from "@/components/admin/BannerForm";

export default async function EditarBannerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const banner = await getBannerById(id);
  if (!banner) notFound();

  return (
    <div>
      <Link
        href="/admin/promociones"
        className="text-sm text-muted hover:text-accent"
      >
        ← Banners
      </Link>
      <h1 className="text-2xl font-semibold mt-2 mb-6">Editar banner</h1>
      <BannerForm banner={banner} />
    </div>
  );
}
