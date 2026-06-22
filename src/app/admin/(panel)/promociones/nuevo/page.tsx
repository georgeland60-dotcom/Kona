import Link from "next/link";
import BannerForm from "@/components/admin/BannerForm";

export default function NuevoBannerPage() {
  return (
    <div>
      <Link
        href="/admin/promociones"
        className="text-sm text-muted hover:text-accent"
      >
        ← Banners
      </Link>
      <h1 className="text-2xl font-semibold mt-2 mb-6">Nuevo banner</h1>
      <BannerForm />
    </div>
  );
}
