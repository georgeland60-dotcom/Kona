import Link from "next/link";
import { getProducts } from "@/lib/store-data";
import { getOrders, getSalesSummary } from "@/lib/orders-data";
import {
  getHistorial,
  contarPor,
  TIPOS_CAMBIO,
} from "@/lib/historial-data";
import { categories } from "@/data/categories";
import { formatPrice } from "@/lib/format";
import { isPersistent } from "@/lib/kv";

// Siempre datos frescos: es una pantalla de consulta, no vale cachearla.
export const dynamic = "force-dynamic";

const nombreCategoria = (slug: string) =>
  slug === "todas"
    ? "Toda la tienda"
    : slug === "varias"
      ? "Varias categorías"
      : (categories.find((c) => c.slug === slug)?.name ?? slug);

function fechaCorta(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("es-PE", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
}

export default async function DatosPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; tipo?: string }>;
}) {
  const { categoria, tipo } = await searchParams;

  const [productos, pedidos, ventas, cambios, todos] = await Promise.all([
    getProducts({ includeInactive: true, raw: true }),
    getOrders(),
    getSalesSummary(),
    getHistorial({ categoria, tipo, limite: 100 }),
    getHistorial(),
  ]);

  const bases = [
    {
      tipo: "productos",
      titulo: "Productos",
      dato: `${productos.length} en catálogo`,
      sub: `${productos.filter((p) => p.active !== false).length} visibles · ${productos.filter((p) => p.onSale).length} en oferta`,
    },
    {
      tipo: "pedidos",
      titulo: "Pedidos",
      dato: `${pedidos.length} registrados`,
      sub: `${ventas.pendientes} pendientes por cobrar`,
    },
    {
      tipo: "ventas",
      titulo: "Ventas",
      dato: formatPrice(ventas.ingresos),
      sub: `${ventas.ventas} ventas · ${ventas.unidades} unidades`,
    },
    {
      tipo: "cambios",
      titulo: "Cambios",
      dato: `${todos.length} registrados`,
      sub: "quién cambió qué y cuándo",
    },
  ];

  // Solo ofrecemos filtrar por lo que de verdad aparece en el historial.
  const porCategoria = contarPor(todos, "categoria");
  const porTipo = contarPor(todos, "tipo");

  const enlaceFiltro = (cambio: { categoria?: string; tipo?: string }) => {
    const p = new URLSearchParams();
    const cat = cambio.categoria ?? categoria;
    const tp = cambio.tipo ?? tipo;
    if (cat) p.set("categoria", cat);
    if (tp) p.set("tipo", tp);
    const q = p.toString();
    return q ? `/admin/datos?${q}` : "/admin/datos";
  };

  const chip = (activo: boolean) =>
    `px-3 py-1.5 rounded-full text-xs border transition ${
      activo
        ? "bg-foreground text-background border-foreground"
        : "border-line hover:border-foreground"
    }`;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Datos</h1>
        <p className="text-muted text-sm">
          El estado de la tienda y el registro de todo lo que se ha cambiado.
        </p>
      </div>

      {!isPersistent() && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
          <strong>Falta conectar la base de datos.</strong> Sin ella, los
          pedidos y el historial no se guardan al reiniciar el servidor.
        </div>
      )}

      {/* Bases descargables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {bases.map((b) => (
          <div
            key={b.tipo}
            className="bg-background border border-line rounded-xl p-5 flex flex-col"
          >
            <p className="text-sm font-medium">{b.titulo}</p>
            <p className="text-2xl font-semibold mt-1">{b.dato}</p>
            <p className="text-xs text-muted mt-0.5 flex-1">{b.sub}</p>
            <a
              href={`/api/admin/export?tipo=${b.tipo}`}
              className="mt-4 text-center border border-foreground px-3 py-2 rounded-lg text-xs font-medium hover:bg-foreground hover:text-background transition"
            >
              Descargar CSV
            </a>
          </div>
        ))}
      </div>

      {/* Historial */}
      <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Historial de cambios</h2>
          <p className="text-muted text-sm">
            Se anota cada cambio confirmado, con quién lo hizo.
          </p>
        </div>
        {(categoria || tipo) && (
          <Link
            href="/admin/datos"
            className="text-sm text-accent hover:text-accent-dark"
          >
            Quitar filtros
          </Link>
        )}
      </div>

      {todos.length > 0 && (
        <div className="space-y-3 mb-5">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted w-20">Categoría</span>
            <Link href={enlaceFiltro({ categoria: "" })} className={chip(!categoria)}>
              Todas
            </Link>
            {porCategoria.map((c) => (
              <Link
                key={c.clave}
                href={enlaceFiltro({ categoria: c.clave })}
                className={chip(categoria === c.clave)}
              >
                {nombreCategoria(c.clave)} ({c.total})
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted w-20">Tipo</span>
            <Link href={enlaceFiltro({ tipo: "" })} className={chip(!tipo)}>
              Todos
            </Link>
            {TIPOS_CAMBIO.filter((t) =>
              porTipo.some((p) => p.clave === t)
            ).map((t) => (
              <Link
                key={t}
                href={enlaceFiltro({ tipo: t })}
                className={chip(tipo === t)}
              >
                {t} ({porTipo.find((p) => p.clave === t)?.total ?? 0})
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="bg-background border border-line rounded-xl overflow-hidden">
        {cambios.length === 0 ? (
          <p className="p-8 text-center text-muted text-sm">
            {todos.length === 0
              ? "Todavía no hay cambios registrados. Aparecerán aquí en cuanto confirmes uno desde Telegram."
              : "Ningún cambio coincide con esos filtros."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-soft/40 border-b border-line">
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Cuándo</th>
                  <th className="px-4 py-3 font-medium">Quién</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium">Cambio</th>
                </tr>
              </thead>
              <tbody>
                {cambios.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 whitespace-nowrap text-muted">
                      {fechaCorta(c.fecha)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{c.quien}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-soft px-2 py-1 rounded-full">
                        {c.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {nombreCategoria(c.categoria)}
                    </td>
                    <td className="px-4 py-3">
                      <p className={c.ok ? "" : "text-muted line-through"}>
                        {c.detalle}
                      </p>
                      {!c.ok && (
                        <p className="text-xs text-muted mt-0.5">no se aplicó</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
