import type { NextConfig } from "next";

// ---- Las direcciones de la tienda anterior --------------------------
//
//  konamoda.pe lleva años en WordPress y tiene enlaces repartidos por
//  Google, Instagram y los chats de las clientas. Al cambiar de sitio,
//  los de producto siguen funcionando solos: la tienda nueva usa el
//  mismo /producto/<slug> y los 84 slugs coinciden uno a uno con los
//  viejos (comprobado contra el backup). Lo que NO coincide son las
//  páginas de categoría y las de carrito y cuenta, que en WooCommerce
//  viven en otras rutas. Sin esto, cada una de ellas daría un 404.
//
//  Las categorías de allá no se llaman igual que las de aquí en dos
//  casos, así que se traducen.
const CATEGORIAS_VIEJAS: Record<string, string> = {
  "set-conjuntos": "conjuntos",
  ofertas: "sale",
};

// Las rutas de WooCommerce que ya no existen aquí. Se mandan a la
// tienda, que es lo más parecido a lo que la persona buscaba.
const RUTAS_WOO = [
  "/carrito",
  "/cart",
  "/finalizar-compra",
  "/checkout",
  "/mi-cuenta",
  "/my-account",
  "/shop",
];

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Categoría: /categoria-producto/vestidos -> /tienda?cat=vestidos
      ...Object.entries(CATEGORIAS_VIEJAS).map(([vieja, nueva]) => ({
        source: `/:base(categoria-producto|product-category)/${vieja}{/}?`,
        destination: `/tienda?cat=${nueva}`,
        permanent: true,
      })),
      {
        source: "/:base(categoria-producto|product-category)/:slug{/}?",
        destination: "/tienda?cat=:slug",
        permanent: true,
      },
      // Ficha de producto con la base en inglés. Los enlaces que guardó el
      // backup usan /producto/ (WooCommerce traduce la base al español),
      // pero si alguno quedó circulando con /product/ no debe dar 404.
      {
        source: "/product/:slug{/}?",
        destination: "/producto/:slug",
        permanent: true,
      },
      // Las etiquetas de WooCommerce no tienen equivalente: a la tienda.
      {
        source: "/:base(etiqueta-producto|product-tag)/:slug{/}?",
        destination: "/tienda",
        permanent: true,
      },
      ...RUTAS_WOO.map((ruta) => ({
        source: `${ruta}{/}?`,
        destination: "/tienda",
        permanent: true,
      })),
    ];
  },
  images: {
    // Next 16 cambio esto: por defecto solo acepta calidad 75 y
    // cualquier otra se degrada en silencio a la mas cercana. Como las
    // fotos de moda son lo que vende, aqui se permite tambien 88, que
    // es la que usan los componentes de marca.
    qualities: [75, 88],
  },
};

export default nextConfig;
