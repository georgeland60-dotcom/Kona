import Link from "next/link";
import { getBanners } from "@/lib/promos-data";
import { deleteBannerAction } from "@/app/admin/promos-actions";

export default async function PromocionesPage() {
  const banners = await getBanners();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Banners del inicio</h1>
          <p className="text-muted text-sm">
            Las diapositivas grandes que se ven al entrar a la tienda.
          </p>
        </div>
        <Link
          href="/admin/promociones/nuevo"
          className="bg-accent text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-accent-dark transition"
        >
          + Nuevo banner
        </Link>
      </div>

      {banners.length === 0 ? (
        <p className="text-sm text-muted bg-background border border-line rounded-xl p-6">
          Aún no hay banners. Crea el primero con el botón de arriba.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {banners.map((b) => (
            <div
              key={b.id}
              className="bg-background border border-line rounded-xl overflow-hidden flex"
            >
              <div className="w-28 placeholder-box flex-shrink-0">
                {b.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.image}
                    alt={b.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="p-4 flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {b.active ? (
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                      Visible
                    </span>
                  ) : (
                    <span className="text-xs bg-soft text-muted px-2 py-0.5 rounded-full">
                      Oculto
                    </span>
                  )}
                </div>
                <p className="text-xs text-accent uppercase tracking-wide truncate">
                  {b.eyebrow}
                </p>
                <p className="font-medium truncate">{b.title}</p>
                <p className="text-sm text-muted line-clamp-2">{b.text}</p>
                <div className="flex items-center gap-3 mt-3 text-sm">
                  <Link
                    href={`/admin/promociones/${b.id}`}
                    className="text-accent hover:underline"
                  >
                    Editar
                  </Link>
                  <form action={deleteBannerAction}>
                    <input type="hidden" name="id" value={b.id} />
                    <button
                      type="submit"
                      className="text-muted hover:text-red-600"
                    >
                      Borrar
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
