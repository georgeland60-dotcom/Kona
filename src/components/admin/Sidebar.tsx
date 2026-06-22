"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/admin/actions";

const links = [
  { href: "/admin", label: "Inicio", exact: true },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/inventario", label: "Inventario / Stock" },
  { href: "/admin/promociones", label: "Banners" },
  { href: "/admin/descuentos", label: "Descuentos" },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="w-full md:w-60 md:min-h-screen bg-foreground text-background flex md:flex-col">
      <div className="px-6 py-5 hidden md:block">
        <Link href="/admin" className="font-script text-4xl text-white">
          Kona
        </Link>
        <p className="text-xs text-background/60 mt-1">Panel de control</p>
      </div>

      <nav className="flex md:flex-col gap-1 px-3 md:px-3 py-3 flex-1 overflow-x-auto">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap transition ${
              isActive(l.href, l.exact)
                ? "bg-accent text-white"
                : "text-background/80 hover:bg-white/10"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-3 md:border-t border-white/10 flex flex-col gap-1">
        <Link
          href="/"
          target="_blank"
          className="px-3 py-2 rounded-lg text-sm text-background/70 hover:bg-white/10 transition"
        >
          Ver tienda ↗
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-background/70 hover:bg-white/10 transition"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
