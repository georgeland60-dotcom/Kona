"use client";

// Carga GA4 y el Pixel de Meta. Solo se monta en producción y solo con
// los identificadores puestos (lo decide app/layout.tsx), así que una
// copia de pruebas no ensucia las estadísticas ni los anuncios.

import Script from "next/script";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

type Ventana = Window & { fbq?: (...args: unknown[]) => void };

export default function Medicion({
  ga4,
  pixel,
}: {
  ga4?: string;
  pixel?: string;
}) {
  const ruta = usePathname();
  const primera = useRef(true);

  // La tienda cambia de página sin recargar. GA4 lo detecta solo (su
  // "medición mejorada" escucha el historial del navegador); el Pixel
  // no, así que se le avisa a mano en cada cambio de página. La primera
  // visita ya la cuenta el propio script al cargar. (Solo la ruta, no los
  // filtros de /tienda?cat=: leer la búsqueda obligaría a envolver todo
  // el sitio en un Suspense, y un filtro no es una página nueva.)
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    (window as Ventana).fbq?.("track", "PageView");
  }, [ruta]);

  return (
    <>
      {ga4 && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4)}`}
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config',${JSON.stringify(ga4)});`}
          </Script>
        </>
      )}
      {pixel && (
        <Script id="pixel-meta" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(pixel)});fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}
