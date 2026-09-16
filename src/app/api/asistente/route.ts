// =============================================================
//  ASISTENTE DE LA TIENDA (para las clientas)
//
//  Recibe lo que escribe quien está comprando y devuelve una respuesta
//  y, si recomienda prendas, las tarjetas de esas prendas.
//
//  Este endpoint es PÚBLICO. Dos consecuencias que mandan sobre todo lo
//  demás:
//   - La IA aquí no tiene NINGUNA herramienta. No puede cambiar precios,
//     stock ni nada: no existe la posibilidad, no es que esté prohibida.
//     Da igual lo que le escriban.
//   - Todo lo que entra se acota: largo del mensaje, cuántos mensajes de
//     historia y cuántas consultas por persona y por día.
// =============================================================

import { preguntarAlModelo, ErrorAgente } from "@/lib/agent/gemini";
import { catalogoParaAsistente } from "@/lib/asistente/catalogo";
import { instruccionAsistente } from "@/lib/asistente/prompt";
import { huellaDe, permitirConsulta } from "@/lib/asistente/limites";
import { anotarConsumo } from "@/lib/consumo-data";
import type { Product } from "@/lib/types";

export const maxDuration = 60;

const MAX_LARGO = 500;
const MAX_HISTORIA = 8;
const MAX_SUGERENCIAS = 3;

type MensajeCliente = { rol: "cliente" | "asistente"; texto: string };

type Sugerencia = {
  slug: string;
  nombre: string;
  precio: number;
  precioAnterior?: number;
  imagen?: string;
  tallas: string[];
};

// La última línea "PRODUCTOS: slug, slug" no es para la clienta: se
// convierte en tarjetas. Aquí se separa una cosa de la otra.
function separarSugerencias(texto: string): {
  respuesta: string;
  slugs: string[];
} {
  const marca = /^\s*PRODUCTOS\s*:\s*(.+)$/im;
  const encontrado = texto.match(marca);
  if (!encontrado) return { respuesta: texto.trim(), slugs: [] };

  const slugs = encontrado[1]
    .split(/[,;]/)
    .map((s) => s.trim().replace(/[^a-z0-9-]/gi, ""))
    .filter(Boolean)
    .slice(0, MAX_SUGERENCIAS);

  return { respuesta: texto.replace(marca, "").trim(), slugs };
}

function aTarjeta(p: Product): Sugerencia {
  return {
    slug: p.slug,
    nombre: p.name,
    precio: p.price,
    precioAnterior: p.oldPrice,
    imagen: p.image,
    tallas: p.variants.filter((v) => v.stock > 0).map((v) => v.size),
  };
}

export async function POST(req: Request) {
  let cuerpo: { mensajes?: MensajeCliente[] };
  try {
    cuerpo = (await req.json()) as { mensajes?: MensajeCliente[] };
  } catch {
    return Response.json({ error: "Mensaje ilegible" }, { status: 400 });
  }

  const mensajes = (cuerpo.mensajes ?? [])
    .filter((m) => typeof m?.texto === "string" && m.texto.trim())
    .slice(-MAX_HISTORIA)
    .map((m) => ({
      rol: m.rol === "asistente" ? ("asistente" as const) : ("cliente" as const),
      texto: m.texto.slice(0, MAX_LARGO),
    }));

  if (mensajes.length === 0) {
    return Response.json({ error: "No dijiste nada" }, { status: 400 });
  }

  const permiso = await permitirConsulta(huellaDe(req));
  if (!permiso.ok) {
    // No es un error: es el asistente diciendo que ahora no puede.
    return Response.json({ respuesta: permiso.mensaje, productos: [] });
  }

  const { texto: catalogo, productos } = await catalogoParaAsistente();

  try {
    const respuesta = await preguntarAlModelo({
      instruccion: instruccionAsistente(catalogo),
      mensajes: mensajes.map((m) => ({
        role: m.rol === "cliente" ? ("user" as const) : ("model" as const),
        parts: [{ text: m.texto }],
      })),
      herramientas: [], // a propósito: aquí no se toca nada de la tienda
      limiteMs: 40_000,
      orden: "economico",
      maximoSalida: 1024,
    });

    await anotarConsumo({
      llamadas: 1,
      tokensEntrada: respuesta.consumo.entrada,
      tokensSalida: respuesta.consumo.salida,
      porModelo: {
        [respuesta.modelo]: {
          llamadas: 1,
          tokensEntrada: respuesta.consumo.entrada,
          tokensSalida: respuesta.consumo.salida,
        },
      },
    });

    const { respuesta: texto, slugs } = separarSugerencias(respuesta.texto);

    // Solo se muestran prendas que existen y tienen stock: el modelo
    // puede equivocarse de slug, y una tarjeta a un producto agotado es
    // una decepción garantizada.
    const sugeridos = slugs
      .map((slug) => productos.find((p) => p.slug === slug))
      .filter(
        (p): p is Product =>
          !!p && p.variants.some((v) => v.stock > 0)
      )
      .map(aTarjeta);

    return Response.json({
      respuesta: texto || "¿Me cuentas un poco más de lo que buscas?",
      productos: sugeridos,
    });
  } catch (error) {
    const esCuota = error instanceof ErrorAgente && !!error.cuota;
    return Response.json({
      respuesta: esCuota
        ? "Ahora mismo no puedo atenderte por aquí 🙏 Escríbenos por WhatsApp y te ayudamos."
        : "Se me cruzaron los cables. ¿Me lo repites?",
      productos: [],
    });
  }
}
