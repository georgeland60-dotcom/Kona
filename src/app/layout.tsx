import type { Metadata } from "next";
import { Jost, Sacramento } from "next/font/google";
import "./globals.css";
import { store } from "@/config/store";

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

export const metadata: Metadata = {
  title: `${store.name} · ${store.tagline}`,
  description: `${store.name} - ${store.tagline}. Envios a todo Lima.`,
};

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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
