// El mapa del sitio para Google. Se arma leyendo el catálogo de
// verdad, así que una prenda nueva entra sola y una que se oculta deja
// de anunciarse: un sitemap escrito a mano envejece en una semana.

import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/store-data";
import { getCategorias } from "@/lib/categorias-data";
import { urlDelSitio } from "@/lib/sitio";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = urlDelSitio();
  const [productos, categorias] = await Promise.all([
    getProducts(),
    getCategorias(),
  ]);

  const fijas = [
    "",
    "/tienda",
    "/nosotros",
    "/contacto",
    "/blog",
    "/cuidados",
    "/politicas-de-envio",
    "/libro-de-reclamaciones",
  ].map((ruta) => ({
    url: `${base}${ruta}`,
    lastModified: new Date(),
    changeFrequency: ruta === "" ? ("daily" as const) : ("monthly" as const),
    priority: ruta === "" ? 1 : 0.5,
  }));

  return [
    ...fijas,
    ...categorias.map((c) => ({
      url: `${base}/tienda?cat=${c.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    // Las fichas de producto son lo que la gente busca por nombre y lo
    // que ya estaba indexado de la tienda anterior: van las primeras en
    // prioridad después del inicio.
    ...productos.map((p) => ({
      url: `${base}/producto/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
