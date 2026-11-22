import type { Metadata } from "next";
import { Jost, Sacramento } from "next/font/google";
import "./globals.css";
import { store } from "@/config/store";
import { esProduccion, urlDelSitio } from "@/lib/sitio";
import Medicion from "@/components/Medicion";

// =============================================================
//  LAS DOS LETRAS DE LA MARCA
//
//  OJO, esto no esta cerrado: el manual pide FUTURA para el cuerpo
//  de texto, y aqui NO hay Futura. Hay Jost, que es una tipografia
//  libre hecha expresamente como version de Futura: mismo esqueleto
//  geometrico, la "a" de un solo piso, la "o" casi circular. De lejos
//  pasa por Futura, de cerca no lo es.
//
//  No esta Futura de verdad porque es de pago y no se puede poner en
//  una web sin licencia: no esta en Google Fonts. Las dos vias son
//  Futura PT en Adobe Fonts (entra en el plan de Creative Cloud, si
//  la marca ya lo tiene no cuesta aparte) o comprar la licencia web
//  en Linotype/Monotype.
//
//  Si se consigue la licencia, el cambio es solo aqui: se carga la
//  familia y se apunta --font-jost a ella. Nada mas en toda la web
//  nombra la tipografia; todo pasa por esta variable.
//
//  La manuscrita si es la que pide el manual: Sacramento.
// =============================================================
const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const sacramento = Sacramento({
  variable: "--font-sacramento",
  subsets: ["latin"],
  weight: "400",
});

// Las etiquetas que leen Google, WhatsApp e Instagram.
//
// metadataBase es la que hace que todo lo demás (la foto que sale al
// compartir un enlace, la dirección canónica de cada ficha) apunte al
// dominio de verdad. Sin ella, Next arma esas direcciones contra
// localhost y al compartir un producto no se ve la foto.
const descripcion = `${store.name} - ${store.tagline}. Envíos a todo Lima y provincias.`;

export const metadata: Metadata = {
  metadataBase: new URL(urlDelSitio()),
  title: {
    default: `${store.name} · ${store.tagline}`,
    // Cada página pone lo suyo delante: "Vestido Dreams · Kona Moda".
    template: `%s · ${store.name}`,
  },
  description: descripcion,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: store.name,
    locale: "es_PE",
    title: `${store.name} · ${store.tagline}`,
    description: descripcion,
  },
};

// Los identificadores son públicos (salen en el código de cada página),
// no son claves: van en variables solo para poder cambiarlos sin tocar
// código. Hay que volver a desplegar después de ponerlos.
const ga4 = process.env.NEXT_PUBLIC_GA4_ID?.trim() || undefined;
const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || undefined;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${jost.variable} ${sacramento.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* GA4 y Pixel de Meta: solo en la tienda de verdad, y solo si
            sus identificadores están puestos en Vercel. Una copia de
            pruebas no cuenta visitas ni alimenta los anuncios. */}
        {esProduccion() && (ga4 || pixel) && <Medicion ga4={ga4} pixel={pixel} />}
      </body>
    </html>
  );
}
