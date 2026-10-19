// =============================================================
//  MEDIDAS DICTADAS A MANO
//
//  Las medidas de una prenda las escribe una persona, no un formulario
//  con casillas: "busto 92, largo 62" o "cintura 72 cm / cadera 98".
//  Aquí se leen las dos formas, y se vuelven a escribir igual de
//  legibles para poder corregirlas después.
//
//  Vive aparte porque lo usan los dos sitios donde se carga un
//  producto: el panel y el bot de Telegram. Si cada uno lo escribiera a
//  su manera, lo cargado por uno se leería raro en el otro.
// =============================================================

import type { MedidaTalla } from "@/lib/types";

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// "busto 92, largo 62" -> { busto: 92, largo: 62 }
export function leerMedidas(bruto: unknown): Record<string, number> {
  const medidas: Record<string, number> = {};
  if (typeof bruto !== "string") return medidas;

  // La coma separa medidas ("busto 92, largo 62") pero también es la
  // coma decimal ("23,7"). Solo separa cuando no va seguida de un dígito.
  for (const trozo of bruto.split(/[;/\n]|,(?!\d)/)) {
    const m = trozo.trim().match(/^([a-zA-ZáéíóúÁÉÍÓÚñÑ _]+)\s*[:=]?\s*([\d.,]+)/);
    if (!m) continue;
    const campo = normalizar(m[1]).replace(/\s+/g, "_");
    const valor = Number(m[2].replace(",", "."));
    if (campo && Number.isFinite(valor)) medidas[campo] = valor;
  }
  return medidas;
}

// { busto: 92, largo: 62 } -> "busto 92, largo 62"
export function medidasATexto(medidas?: Record<string, number>): string {
  if (!medidas) return "";
  return Object.entries(medidas)
    .map(([campo, valor]) => `${campo.replace(/_/g, " ")} ${valor}`)
    .join(", ");
}

// La guía entera, una talla por línea:
//   M: busto 92, largo 62
//   L: busto 97, largo 64
export function leerGuiaDeTexto(texto: string): MedidaTalla[] {
  const guia: MedidaTalla[] = [];
  for (const linea of texto.split("\n")) {
    const limpia = linea.trim();
    if (!limpia) continue;

    // Lo de antes de los dos puntos es la talla. Sin dos puntos no se
    // puede saber dónde acaba la talla y empiezan las medidas.
    const corte = limpia.indexOf(":");
    if (corte < 1) continue;

    const talla = limpia.slice(0, corte).trim();
    const medidas = leerMedidas(limpia.slice(corte + 1));
    if (talla && Object.keys(medidas).length > 0) guia.push({ talla, medidas });
  }
  return guia;
}

export function guiaATexto(guia?: MedidaTalla[]): string {
  if (!guia) return "";
  return guia
    .map((m) => `${m.talla}: ${medidasATexto(m.medidas)}`)
    .join("\n");
}
