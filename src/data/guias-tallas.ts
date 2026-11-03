// =============================================================
//  LAS TABLAS DE TALLAS DE VERDAD
//
//  Están transcritas una por una de las fotos que la tienda publica en
//  cada producto ("GUÍA DE TALLAS", fondo rosa). Antes la web estimaba
//  las medidas a partir de la categoría, y una estimación en un sitio
//  donde la clienta decide si compra o no termina en una devolución.
//
//  Tres cosas que se respetan tal cual vienen en la foto:
//
//   - Los RANGOS ("80-100"). La tela cede, y la tienda lo dice así a
//     propósito. Convertirlos a un número sería inventarse una
//     precisión que no existe, por eso el valor puede ser texto.
//   - Las medidas son DE LA PRENDA, no del cuerpo.
//   - Los SETS llevan dos tablas, una por prenda (la polera y el
//     pantalón). Enseñar una sola, o mezclarlas, es justo lo que
//     hacía la web antes y lo que no se entendía.
//
//  Las tallas que no estén en esta tabla pero sí se vendan (pasa: el
//  cárdigan Joy se vende en S y la foto empieza en M) simplemente no
//  salen. Mejor una fila de menos que una medida inventada.
//
//  Va aparte de products.ts a propósito: ese archivo se regenera cada
//  vez que se importa el catálogo, y esto se perdería.
// =============================================================

import type { MedidaTalla } from "@/lib/types";

export type PrendaConMedidas = {
  // Cómo se llama la prenda dentro del conjunto ("Polera", "Palazzo").
  // Una prenda suelta no lleva nombre.
  nombre?: string;
  medidas: MedidaTalla[];
};

export type GuiaDeModelo = {
  prendas: PrendaConMedidas[];
  nota: string;
};

// Se escribe igual que se lee en la foto: las tallas en la cabecera y
// una fila por medida. Así transcribir es copiar, y copiar mal se ve.
function tabla(
  tallas: string[],
  filas: Record<string, (string | number)[]>
): MedidaTalla[] {
  return tallas.map((talla, i) => {
    const medidas: Record<string, string | number> = {};
    for (const [campo, valores] of Object.entries(filas)) {
      const v = valores[i];
      if (v !== undefined && v !== "") medidas[campo] = v;
    }
    return { talla, medidas };
  });
}

const APROX = "Medidas aproximadas de la prenda, en centímetros.";

export const GUIAS_DE_TALLAS: { slugs: string[]; guia: GuiaDeModelo }[] = [
  // ---- Básicos ------------------------------------------------------
  {
    slugs: ["basico-feel-beige", "basico-feel-green"],
    guia: {
      prendas: [
        {
          medidas: tabla(["S", "M", "L", "XL"], {
            busto: ["80-100", "87-107", "94-114", "102-122"],
            cadera: ["84-104", "90-110", "98-118", "105-125"],
            largo: [56, 58, 61, 62],
          }),
        },
      ],
      nota: `${APROX} La tela es licrada y cede de 15 a 25 cm como mínimo.`,
    },
  },
  {
    slugs: ["basico-ketzy-beige", "basico-ketzy-rosa"],
    guia: {
      prendas: [
        {
          medidas: tabla(["S", "M", "L", "XL"], {
            busto: ["88-100", "92-106", "96-115", "100-125"],
            cadera: ["90-105", "94-110", "100-120", "104-125"],
            largo: [58, 60, 62, 64],
          }),
        },
      ],
      nota: `${APROX} La tela es licrada y cede de 15 a 25 cm como mínimo.`,
    },
  },

  // ---- Cafarenas y sweaters -----------------------------------------
  {
    slugs: ["cafarena-woolly-fucsia"],
    guia: {
      prendas: [
        {
          medidas: tabla(["S", "M", "L", "XL"], {
            busto: ["85-105", "90-113", "95-118", "99-125"],
            cadera: ["87-110", "93-115", "98-122", "105-130"],
            largo: [61, 63, 65, 67],
          }),
        },
      ],
      nota: `${APROX} El límite del rango es referencial: la tela cede 20 cm como mínimo.`,
    },
  },
  {
    slugs: ["sweater-gaby-negro", "sweater-gaby-rosa", "sweater-perla"],
    guia: {
      prendas: [
        {
          medidas: tabla(["S", "M", "L", "XL"], {
            busto: ["88-100", "92-106", "96-115", "100-125"],
            cadera: ["90-103", "96-111", "104-119", "112-130"],
            largo: [58, 60, 62, 64],
          }),
        },
      ],
      nota: `${APROX} La tela es licrada y cede de 15 a 25 cm como mínimo.`,
    },
  },

  // ---- Cárdigans ----------------------------------------------------
  {
    slugs: ["cardigan-ceci-beige", "cardigan-ceci-perla", "cardigan-ceci-rosa"],
    guia: {
      prendas: [
        {
          medidas: tabla(["S", "M", "L", "XL"], {
            busto: [108, 116, 124, 132],
            cintura_baja: ["80-92", "90-102", "100-112", "110-122"],
            largo: [47, 49, 51, 53],
          }),
        },
      ],
      nota: `${APROX} El calce del cárdigan es holgado y la tela es waffle chompero stretch.`,
    },
  },
  {
    slugs: ["cardigan-pia-plomo"],
    guia: {
      prendas: [
        {
          medidas: tabla(["S", "M", "L", "XL"], {
            busto: [108, 116, 124, 132],
            cintura_baja: ["80-92", "90-102", "100-112", "110-122"],
            largo: [47, 49, 51, 53],
          }),
        },
      ],
      nota: `${APROX} El calce del cárdigan es holgado y la tela es waffle chompero stretch.`,
    },
  },
  {
    // La foto junta S y M en una sola columna; aquí se reparte la misma
    // medida a las dos tallas, que es como se venden.
    slugs: ["cardigan-cloud-verde", "cardigan-cloud-amarillo"],
    guia: {
      prendas: [
        {
          medidas: tabla(["S", "M", "L", "XL", "XXL"], {
            busto: ["94-100", "94-100", 115, 118, 128],
            cadera: ["100-105", "100-105", "115-125", "120-130", "130-135"],
            largo: [48, 48, 54, 55, 56],
          }),
        },
      ],
      nota: `${APROX} La tabla de la marca junta S y M en una sola medida.`,
    },
  },
  {
    // La foto empieza en M: de la S no hay medida publicada y no se
    // inventa.
    slugs: ["cardigan-joy-rosa", "cardigan-joy-celeste", "cardigan-joy-verde"],
    guia: {
      prendas: [
        {
          medidas: tabla(["M", "L", "XL", "XXL"], {
            busto: [108, 115, 118, 128],
            cadera: ["105-115", "115-125", "120-130", "130-135"],
            largo: [52, 54, 55, 56],
          }),
        },
      ],
      nota: `${APROX} De la talla S no tenemos medidas publicadas: si la necesitas, te la medimos por WhatsApp.`,
    },
  },

  // ---- Chalecos y casacas -------------------------------------------
  {
    slugs: ["chaleco-yess", "chaleco-yess-acero"],
    guia: {
      prendas: [
        {
          medidas: tabla(["S", "M", "L", "XL"], {
            busto: [98, 106, 114, 125],
            cadera: [107, 115, 123, 132],
            largo: [101, 103, 105, 107],
          }),
        },
      ],
      nota: `${APROX} La tela es stretch y cede hasta 20 cm.`,
    },
  },
  {
    slugs: ["casaca-jean-love", "casaca-jean-love-azul"],
    guia: {
      prendas: [
        {
          medidas: tabla(["S", "M", "L", "XL", "XXL"], {
            busto: [108, 112, 116, 120, 125],
            cintura_baja: [97, 101, 105, 109, 115],
            largo: [48, 50, 52, 54, 54],
          }),
        },
      ],
      nota: `${APROX} La tela es stretch y cede hasta 15 cm.`,
    },
  },

  // ---- Blusas y tops ------------------------------------------------
  {
    // La foto junta S y M en una columna, y estos tops se venden de la
    // M para arriba: esa columna es la de la M y punto.
    slugs: [
      "top-princess-beige",
      "top-princess-fuccia",
      "top-princess-lila",
      "top-princess-negro",
      "top-princess-verde",
    ],
    guia: {
      prendas: [
        {
          medidas: tabla(["M", "L", "XL"], {
            busto: ["83-100", "95-115", "105-125"],
            cintura_baja: ["75-95", "85-105", "95-125"],
            largo: [48, 51, 54],
          }),
        },
      ],
      nota: `${APROX} El top es entallado y la tela es rib esmirna stretch (flexible).`,
    },
  },

  // ---- Vestidos -----------------------------------------------------
  {
    slugs: ["dress-pams-malva", "dress-pams-negro", "dress-pams-verde"],
    guia: {
      prendas: [
        {
          medidas: tabla(["S", "M", "L", "XL"], {
            busto: [108, 116, 125, 135],
            cadera: [130, 135, 130, 140],
            largo: [93, 95, 97, 97],
          }),
        },
      ],
      nota: `${APROX} El calce del vestido es holgado y la tela estira unos 5 cm.`,
    },
  },
  {
    slugs: ["vestido-dreams-rosa", "vestido-dreams-verde"],
    guia: {
      prendas: [
        {
          medidas: tabla(["S", "M", "L", "XL"], {
            busto: [108, 115, 125, 135],
            cintura: [94, 102, 110, 118],
            cadera: [114, 122, 130, 140],
            largo: [129, 130, 132, 133],
          }),
        },
      ],
      nota: `${APROX} El calce del vestido es holgado y la tela estira unos 5 cm.`,
    },
  },
  {
    slugs: ["vestido-flowers-celeste", "vestidos-flowers-beige"],
    guia: {
      prendas: [
        {
          medidas: tabla(["S", "M", "L", "XL"], {
            busto: [105, 116, 125, 130],
            cadera: [132, 140, 148, 154],
            largo: [93, 95, 97, 97],
          }),
        },
      ],
      nota: `${APROX} El fit del vestido es holgado y la tela estira de 5 a 10 cm.`,
    },
  },

  // ---- Pantalones y jeans (van por número) --------------------------
  {
    slugs: ["jean-flare-ari-azul", "jean-flare-ari-negro"],
    guia: {
      prendas: [
        {
          medidas: tabla(["30", "32", "34", "36", "38", "40"], {
            cintura: ["69-89", "73-93", "77-97", "81-101", "85-105", "95-115"],
            cadera: [
              "82-105",
              "85-110",
              "90-115",
              "98-119",
              "110-125",
              "106-135",
            ],
            largo: [98, 99, 100, 101, 102, 103],
          }),
        },
      ],
      nota: `${APROX} La tela tiene 5% de spandex, por eso estira más de 20 cm sin perder forma.`,
    },
  },
  {
    slugs: ["paper-bag-jean-lu"],
    guia: {
      prendas: [
        {
          medidas: tabla(["30", "32", "34", "36", "38", "40"], {
            cintura: ["75-87", "78-90", "83-95", "86-98", "92-104", "100-112"],
            cadera: [
              "94-104",
              "98-108",
              "104-114",
              "108-118",
              "115-125",
              "128-142",
            ],
            largo: [92, 95, 95, 95, 96, 96],
          }),
        },
      ],
      nota: `${APROX} La cintura lleva pretina con elástico firme y la tela tiene 2% de spandex: estira unos 10 cm como mínimo.`,
    },
  },
  {
    slugs: ["paper-bag-leti-golden-beige", "paper-bag-leti-negro"],
    guia: {
      prendas: [
        {
          medidas: tabla(["30", "32", "34", "36", "38", "40"], {
            cintura: ["70-85", "74-89", "78-93", "81-96", "87-102", "96-110"],
            cadera: [
              "92-104",
              "98-110",
              "102-114",
              "107-119",
              "115-128",
              "128-145",
            ],
            largo: [92, 95, 95, 95, 96, 96],
          }),
        },
      ],
      nota: `${APROX} La cintura lleva pretina con elástico firme y la tela tiene 2% de spandex: estira unos 10 cm como mínimo.`,
    },
  },
  {
    slugs: ["slouchy-jean-cris", "slouchy-jean-cris-2"],
    guia: {
      prendas: [
        {
          medidas: tabla(["30", "32", "34", "36", "38", "40"], {
            cintura: ["70-85", "74-89", "78-95", "85-99", "90-105", "100-115"],
            cadera: [108, 113, 118, 123, 128, 136],
            largo: [93, 94, 95, 96, 97, 97],
          }),
        },
      ],
      nota: `${APROX} Lleva pretina con elástico atrás (estira 15 cm como mínimo) y la tela tiene 3% de spandex: estira unos 10 cm.`,
    },
  },
  {
    slugs: ["jogger-kia-beige", "jogger-kia-lila"],
    guia: {
      prendas: [
        {
          medidas: tabla(["S", "M", "L", "XL"], {
            cintura: ["65-85", "72-95", "85-105", "90-115"],
            cadera: [108, 114, 120, 130],
            largo: [91, 93, 95, 96],
          }),
        },
      ],
      nota: `${APROX} La cadera va sin estirar. La cintura tiene elástico y estira 25 cm como mínimo; la tela es stretch y estira hasta 15 cm.`,
    },
  },
  {
    slugs: ["palazzo-tefa-beige", "palazzo-tefa-lila"],
    guia: {
      prendas: [
        {
          medidas: tabla(["S", "M", "L", "XL"], {
            cintura: ["68-90", "75-98", "88-110", "105-130"],
            cadera: [106, 114, 127, 137],
            largo: [96, 97, 98, 99],
          }),
        },
      ],
      nota: `${APROX} El calce del palazzo es holgado y la tela es algodón rib stretch.`,
    },
  },

  // ---- Shorts -------------------------------------------------------
  {
    slugs: ["shorts-holiday-fucsia", "shorts-holiday-fucsia-2", "shorts-holiday-marron"],
    guia: {
      prendas: [
        {
          medidas: tabla(["M", "L", "XL", "XXL"], {
            cintura: ["75-95", "90-115", "100-125", "115-135"],
            cadera: [115, 122, 130, 140],
            largo: [41, 42, 42.5, 43.5],
          }),
        },
      ],
      nota: APROX,
    },
  },
  {
    slugs: ["shorts-libertad-negro", "shorts-libertad-rosa"],
    guia: {
      prendas: [
        {
          medidas: tabla(["S", "M", "L", "XL"], {
            cintura: ["65-80", "75-90", "85-100", "95-115"],
            cadera: [105, 115, 125, 140],
            largo: [38, 38.5, 40, 42],
          }),
        },
      ],
      nota: `${APROX} La cintura tiene pretina con elástico firme y cómodo. La tela no tiene spandex: no estira.`,
    },
  },

  // ---- Conjuntos: cada prenda, su tabla ------------------------------
  {
    slugs: ["set-majo-celeste", "set-majo-negro"],
    guia: {
      prendas: [
        {
          nombre: "Polera",
          medidas: tabla(["S", "M", "L", "XL"], {
            busto: [110, 122, 132, 138],
            cadera: [112, 120, 130, 136],
            largo: [56, 57, 58, 56],
          }),
        },
        {
          nombre: "Palazzo",
          medidas: tabla(["S", "M", "L", "XL"], {
            cintura: ["68-88", "75-95", "85-105", "90-115"],
            cadera: [108, 116, 124, 135],
            largo: [95, 97, 98, 99],
          }),
        },
      ],
      nota: `${APROX} Van sin estirar. El calce es holgado y la tela es rib chompero stretch.`,
    },
  },
  {
    slugs: ["set-lau"],
    guia: {
      prendas: [
        {
          nombre: "Polo",
          medidas: tabla(["S", "M", "L", "XL"], {
            busto: [100, 110, 120, 132],
            cadera: [102, 112, 122, 134],
            largo: [60, 62, 64, 66],
            contorno_manga: [48, 50, 52, 53],
          }),
        },
        {
          nombre: "Pantalón",
          medidas: tabla(["S", "M", "L", "XL"], {
            cintura: ["68-85", "75-95", "85-105", "90-110"],
            cadera: [106, 114, 127, 137],
            largo: [96, 97, 98, 99],
          }),
        },
      ],
      nota: `${APROX} Van sin estirar. El calce es holgado y la tela es algodón rib stretch.`,
    },
  },
  {
    // Este set comparte una sola tabla: el busto es de la camisa y la
    // cintura y la cadera, del short. Los dos largos van aparte.
    slugs: ["set-luz-naranja", "set-luz-negro", "set-luz-pistacho"],
    guia: {
      prendas: [
        {
          nombre: "Camisa",
          medidas: tabla(["M", "L", "XL", "XXL"], {
            busto: ["99-110", "105-120", "115-130", "125-140"],
            largo: [66, 68.5, 71, 73.5],
          }),
        },
        {
          nombre: "Short",
          medidas: tabla(["M", "L", "XL", "XXL"], {
            cintura: ["70-95", "90-110", "105-120", "115-130"],
            cadera: ["95-110", "105-120", "115-130", "125-150"],
            largo: [41, 44, 47, 50],
          }),
        },
      ],
      nota: APROX,
    },
  },

  // ---- Ropa de baño --------------------------------------------------
  {
    slugs: ["bikini-waves-celeste"],
    guia: {
      prendas: [
        {
          medidas: tabla(["M", "L", "XL", "XXL"], {
            busto: ["80-95", "90-110", "105-120", "115-130"],
            cintura: ["70-80", "85-92", "90-105", "105-120"],
            cadera: ["85-105", "105-120", "115-130", "130-145"],
          }),
        },
      ],
      nota: `${APROX} La tela es de alto nivel de stretch: estira hasta más de 20 cm.`,
    },
  },
  {
    slugs: ["strapless-waves-lila", "strapless-waves-negro"],
    guia: {
      prendas: [
        {
          medidas: tabla(["S-M", "L-XL"], {
            busto: ["70-95", "95-120"],
            cintura: ["70-85", "85-100"],
            cadera: ["75-100", "95-120"],
          }),
        },
      ],
      nota: `${APROX} La licra estira hasta 20 cm y el top es regulable en la parte de atrás.`,
    },
  },
  {
    slugs: [
      "ropa-de-bano-bali-azul",
      "ropa-de-bano-bali-negra",
      "ropa-de-bano-bali-verde",
      "ropa-de-bano-bali-roja",
    ],
    guia: {
      prendas: [
        {
          medidas: tabla(["M", "L", "XL", "XXL"], {
            busto: ["95-105", "105-115", "110-120", "115-125"],
            cintura: ["75-90", "90-110", "105-115", "110-120"],
            cadera: ["95-110", "110-125", "120-140", "125-145"],
          }),
        },
      ],
      nota: `${APROX} La tela estira hasta unos 20 cm en cintura y cadera.`,
    },
  },
];

// Índice por slug, armado una vez.
const POR_SLUG = new Map<string, GuiaDeModelo>();
for (const { slugs, guia } of GUIAS_DE_TALLAS) {
  for (const slug of slugs) POR_SLUG.set(slug, guia);
}

export function guiaDelModelo(slug: string): GuiaDeModelo | undefined {
  return POR_SLUG.get(slug);
}
