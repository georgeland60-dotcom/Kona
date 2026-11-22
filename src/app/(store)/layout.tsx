import { CartProvider } from "@/components/cart/CartContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/cart/CartDrawer";
import { getCategorias } from "@/lib/categorias-data";
import { getProducts } from "@/lib/store-data";
import { getLiveRules } from "@/lib/promos-data";
import { descuentosPorCategoria } from "@/lib/descuentos-por-categoria";
import KonaAssistant from "@/components/asistente/KonaAssistant";

// El menú se arma aquí, en el servidor, porque las categorías ya no son
// una lista fija en el código: se pueden crear desde el asistente.
export default async function StoreLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // El menu necesita saber que categorias estan de oferta para poner
  // el puntito. Va aqui y no en el Header porque el Header es un
  // componente de cliente y esto se lee en el servidor.
  const [categorias, products, rules] = await Promise.all([
    getCategorias(),
    getProducts(),
    getLiveRules(),
  ]);
  const conDescuento = [...descuentosPorCategoria(rules, products).keys()];

  return (
    <CartProvider>
      <Header categorias={categorias} conDescuento={conDescuento} />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
      <KonaAssistant />
    </CartProvider>
  );
}
