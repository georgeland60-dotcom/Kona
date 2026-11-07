// Qué puede mirar un buscador.
//
// El panel y las rutas internas quedan fuera: no son secretas (el panel
// pide contraseña igual), pero no tienen por qué salir en Google.
//
// Y una previsualización no se indexa: dos copias de la misma tienda
// compitiendo en el buscador se restan entre ellas.

import type { MetadataRoute } from "next";
import { esProduccion, urlDelSitio } from "@/lib/sitio";

export default function robots(): MetadataRoute.Robots {
  const base = urlDelSitio();

  if (!esProduccion()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/pago/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
