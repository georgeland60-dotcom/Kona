"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { store } from "@/config/store";
import { categories } from "@/data/categories";
import { useCart } from "@/components/cart/CartContext";

export default function Header() {
  const { count, setOpen } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [prodOpen, setProdOpen] = useState(false);

  const closeMenu = () => {
    setMenuOpen(false);
    setProdOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-line">
      {/* Barra de aviso superior */}
      <div className="bg-foreground text-background text-center text-xs py-2 px-4 tracking-wide">
        {store.announcement}
      </div>

      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Boton menu en celular */}
          <button
            className="md:hidden p-2 -ml-2"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            <span className="block w-6 h-0.5 bg-foreground mb-1.5" />
            <span className="block w-6 h-0.5 bg-foreground mb-1.5" />
            <span className="block w-6 h-0.5 bg-foreground" />
          </button>

          {/* Logo */}
          <Link
            href="/"
            aria-label={store.name}
            className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0"
          >
            <Image
              src="/logo-kona.webp"
              alt={store.name}
              width={258}
              height={230}
              priority
              className="h-12 w-auto"
            />
          </Link>

          {/* Menu en escritorio */}
          <nav className="hidden md:flex items-center gap-5 text-[13px] uppercase tracking-wide">
            <Link href="/" className="hover:text-accent transition">
              Inicio
            </Link>
            <Link
              href="/tienda?cat=nuevos-ingresos"
              className="hover:text-accent transition"
            >
              Nuevos ingresos
            </Link>
            <Link
              href="/tienda?cat=carteras"
              className="hover:text-accent transition"
            >
              Carteras
            </Link>

            {/* Productos con submenu */}
            <div className="relative group">
              <Link
                href="/tienda"
                className="flex items-center gap-1 hover:text-accent transition"
              >
                Productos
                <span className="text-[8px]">▼</span>
              </Link>
              <div className="absolute left-0 top-full pt-3 hidden group-hover:block">
                <div className="bg-background border border-line rounded-lg shadow-lg py-2 w-52 normal-case tracking-normal">
                  {categories.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/tienda?cat=${c.slug}`}
                      className="block px-4 py-2 text-sm hover:bg-soft hover:text-accent transition"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <Link
              href="/tienda?cat=sale"
              className="text-accent font-medium hover:opacity-80 transition"
            >
              Sale
            </Link>
            <Link href="/nosotros" className="hover:text-accent transition">
              Nosotros
            </Link>
            <Link href="/contacto" className="hover:text-accent transition">
              Contactos
            </Link>
            <Link href="/blog" className="hover:text-accent transition">
              Blog
            </Link>
          </nav>

          {/* Carrito */}
          <button
            onClick={() => setOpen(true)}
            className="relative p-2 -mr-2"
            aria-label="Carrito"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-accent text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center">
                {count}
              </span>
            )}
          </button>
        </div>

        {/* Menu desplegable en celular */}
        {menuOpen && (
          <nav className="md:hidden pb-4 flex flex-col gap-1 text-sm border-t border-line pt-3">
            <Link href="/" onClick={closeMenu} className="py-1.5">
              Inicio
            </Link>
            <Link href="/tienda?cat=nuevos-ingresos" onClick={closeMenu} className="py-1.5">
              Nuevos ingresos
            </Link>
            <Link href="/tienda?cat=carteras" onClick={closeMenu} className="py-1.5">
              Carteras
            </Link>

            <button
              onClick={() => setProdOpen((v) => !v)}
              className="py-1.5 flex items-center justify-between text-left"
            >
              Productos
              <span className="text-xs">{prodOpen ? "−" : "+"}</span>
            </button>
            {prodOpen && (
              <div className="pl-4 flex flex-col gap-0.5 border-l border-line ml-1">
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/tienda?cat=${c.slug}`}
                    onClick={closeMenu}
                    className="py-1.5 text-muted hover:text-accent"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            )}

            <Link href="/tienda?cat=sale" onClick={closeMenu} className="py-1.5 text-accent font-medium">
              Sale
            </Link>
            <Link href="/nosotros" onClick={closeMenu} className="py-1.5">
              Nosotros
            </Link>
            <Link href="/contacto" onClick={closeMenu} className="py-1.5">
              Contactos
            </Link>
            <Link href="/blog" onClick={closeMenu} className="py-1.5">
              Blog
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
