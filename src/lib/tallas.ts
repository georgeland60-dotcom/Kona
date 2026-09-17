// =============================================================
//  GUÍA DE TALLAS, PRENDA POR PRENDA
//
//  Cada producto tiene la suya: una "M" no mide lo mismo en una blusa de
//  gasa que en una chompa. Cuando la prenda trae sus medidas cargadas,
//  se usan esas y punto.
//
//  Mientras no las tenga, se muestra una referencia ESTIMADA a partir de
//  la categoría y las tallas que maneja. Va siempre marcada como
//  estimada: una medida inventada que se presenta como exacta termina en
//  una devolución, y eso es peor que decir "es referencial, si quieres te
//  la medimos".
// =============================================================

import type { MedidaTalla, Product } from "@/lib/types";
import { store } from "@/config/store";

// Qué se mide en cada tipo de prenda, y cuánto mide en la talla base
// (la M de ropa, el 37 de calzado). El resto de tallas sale sumando.
type Molde = {
  campos: Record<string, number>; // medida en la talla base
  paso: Record<string, number>; // cuánto crece por talla
};

const MOLDES: Record<string, Molde> = {
  superior: {
    campos: { busto: 92, largo: 62, manga: 58 },
    paso: { busto: 5, largo: 2, manga: 1 },
  },
  inferior: {
    campos: { cintura: 72, cadera: 98, largo: 100, tiro: 28 },
    paso: { cintura: 5, cadera: 5, largo: 2, tiro: 1 },
  },
  vestido: {
    campos: { busto: 92, cintura: 74, largo: 110 },
    paso: { busto: 5, cintura: 5, largo: 2 },
  },
  bano: {
    campos: { busto: 88, cadera: 94 },
    paso: { busto: 5, cadera: 5 },
  },
  calzado: {
    campos: { largo_del_pie: 23.7 },
    paso: { largo_del_pie: 0.7 },
  },
};

const POR_CATEGORIA: Record<string, keyof typeof MOLDES> = {
  blusas: "superior",
  basicos: "superior",
  cafarenas: "superior",
  cardigans: "superior",
  chalecos: "superior",
  chompas: "superior",
  pantalones: "inferior",
  joggers: "inferior",
  shorts: "inferior",
  "full-denim": "inferior",
  vestidos: "vestido",
  conjuntos: "vestido",
  "ropa-de-bano": "bano",
  calzado: "calzado",
};

// El orden de las tallas de ropa, para saber cuánto se aleja cada una de
// la base.
const ESCALA = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

function distanciaALaBase(talla: string, tipo: keyof typeof MOLDES): number | null {
  const limpia = talla.trim().toUpperCase();

  const enEscala = ESCALA.indexOf(limpia);
  if (enEscala >= 0) return enEscala - ESCALA.indexOf("M");

  // Números: solo significan algo en calzado, donde la escala es
  // conocida (el 37 de base). En un pantalón un "32" es una talla de la
  // marca, no una medida, y tratarla como un número de zapato daba
  // cinturas de 37 cm. Sin escala fiable, no se estima nada.
  if (tipo === "calzado") {
    const numero = Number(limpia.replace(",", "."));
    if (Number.isFinite(numero) && numero >= 30 && numero <= 48) {
      return numero - 37;
    }
  }

  return null; // "Única", tallas por número de marca, y cualquier otra
}

// ¿Esta prenda no lleva talla? (una cartera, un accesorio)
export function esTallaUnica(producto: Product): boolean {
  const tallas = producto.variants.map((v) => v.size.trim().toLowerCase());
  if (tallas.length === 0) return true;
  return tallas.every((t) => t === "única" || t === "unica" || t === "u");
}

// ¿La prenda tiene esa talla? Sirve para no afirmar nunca una talla que
// no existe en esa prenda: los pantalones van por número y una "M" ahí
// no significa nada.
function tieneTalla(producto: Product, talla: string): boolean {
  const buscada = talla.trim().toLowerCase();
  return producto.variants.some((v) => v.size.trim().toLowerCase() === buscada);
}

function redondear(n: number): number {
  return Math.round(n * 10) / 10;
}

export type GuiaDeTallas = {
  medidas: MedidaTalla[];
  estimada: boolean;
  nota: string;
};

export function guiaDeProducto(producto: Product): GuiaDeTallas | null {
  // Lo cargado manda siempre.
  if (producto.guiaTallas && producto.guiaTallas.length > 0) {
    return {
      medidas: producto.guiaTallas,
      estimada: false,
      nota: "Medidas de la prenda, en centímetros.",
    };
  }

  // Sin medidas cargadas: o se estiman, o se remite a la tabla que la
  // tienda pone en las fotos. Dos tablas distintas para la misma prenda
  // confunden más que ninguna.
  if (!store.medidasEstimadas) return null;

  const tipo = POR_CATEGORIA[producto.category];
  const molde = tipo ? MOLDES[tipo] : undefined;
  if (!molde || !tipo) return null;

  const medidas: MedidaTalla[] = [];
  for (const variante of producto.variants) {
    const distancia = distanciaALaBase(variante.size, tipo);
    if (distancia === null) continue;

    const valores: Record<string, number> = {};
    for (const [campo, base] of Object.entries(molde.campos)) {
      valores[campo] = redondear(base + distancia * (molde.paso[campo] ?? 0));
    }
    medidas.push({ talla: variante.size, medidas: valores });
  }

  if (medidas.length === 0) return null;

  return {
    medidas,
    estimada: true,
    nota:
      "Medidas referenciales en centímetros. Todavía no tenemos medidas exactas de esta prenda: si quieres, te la medimos por WhatsApp antes de que decidas.",
  };
}

// Cómo se lee una guía en una línea de texto (para el asistente).
export function guiaEnTexto(guia: GuiaDeTallas): string {
  return guia.medidas
    .map(
      (m) =>
        `${m.talla}: ` +
        Object.entries(m.medidas)
          .map(([campo, valor]) => `${campo.replace(/_/g, " ")} ${valor} cm`)
          .join(", ")
    )
    .join(" · ");
}

// La referencia de la modelo de las fotos.
//
// Si la prenda trae la suya, esa manda y se dice en concreto. Si no, se
// da la referencia general de la tienda, dicha como lo que es: un "en
// general", no un dato de esa foto. Afirmar de una foto concreta algo
// que no se sabe es justo lo que hace que luego no calce.
export function modeloEnTexto(producto: Product): string | null {
  // Una cartera no tiene talla: decir que la modelo "está usando M" es
  // absurdo y resta credibilidad a todo lo demás.
  if (esTallaUnica(producto)) return null;

  const m = producto.modeloFoto;

  if (!m) {
    const ref = store.modeloReferencia;
    // La talla de referencia de la tienda ("M") solo vale si esta prenda
    // la tiene: los pantalones van por número y ahí una M no existe.
    // Antes se afirmaba igual, y quedaba en evidencia.
    if (!ref?.talla || !tieneTalla(producto, ref.talla)) return null;

    // Se dice en presente y en concreto, como pidió la tienda: es la
    // talla con la que se fotografían las prendas mientras no se cargue
    // la de cada una.
    return (
      `La modelo está usando talla ${ref.talla}` +
      (ref.altura ? ` y mide ${(ref.altura / 100).toFixed(2)} m` : "") +
      "."
    );
  }

  // Si la talla cargada no existe en la prenda, algo se cargó mal: mejor
  // no decir nada que decir una talla que no se puede pedir.
  if (!tieneTalla(producto, m.talla)) return null;

  const partes = [`está usando talla ${m.talla}`];
  if (m.altura) partes.push(`mide ${(m.altura / 100).toFixed(2)} m`);
  if (m.medidas && Object.keys(m.medidas).length > 0) {
    partes.push(
      Object.entries(m.medidas)
        .map(([campo, valor]) => `${campo} ${valor}`)
        .join("/")
    );
  }
  return `La modelo de las fotos ${partes.join(", ")}.`;
}
