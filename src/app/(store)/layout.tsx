import { CartProvider } from "@/components/cart/CartContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/cart/CartDrawer";
import { getCategorias } from "@/lib/categorias-data";
import KonaAssistant from "@/components/asistente/KonaAssistant";

// El menú se arma aquí, en el servidor, porque las categorías ya no son
// una lista fija en el código: se pueden crear desde el asistente.
export default async function StoreLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const categorias = await getCategorias();

  return (
    <CartProvider>
      <Header categorias={categorias} />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
      <KonaAssistant />
    </CartProvider>
  );
}
