// =============================================================
//  "¿A qué distrito corresponde esta dirección?"
//
//  Recibe lo que la clienta escribió y devuelve las direcciones que
//  encontró el mapa, cada una con su distrito y lo que cuesta llevarle
//  el pedido ahí.
//
//  El precio sale SIEMPRE de la tabla de la tienda. El mapa solo dice
//  en qué distrito cae la dirección; cuánto vale ese distrito lo decide
//  la tienda, y se vuelve a comprobar al cobrar.
// =============================================================

import { buscarDireccion, geocodificadorEnUso } from "@/lib/geocodificador";
import { destinoDeCandidatos, destinoEnTexto } from "@/lib/envios";
import { huellaDe } from "@/lib/asistente/limites";
import { contar } from "@/lib/kv";

export const maxDuration = 20;

export async function GET(req: Request) {
  const texto = new URL(req.url).searchParams.get("q") ?? "";
  if (texto.trim().length < 6) {
    return Response.json({ opciones: [] });
  }

  // Tope propio, aparte del de la IA: el mapa es gratis pero de otra
  // gente, y una tienda no necesita más de unas pocas búsquedas por
  // minuto y persona. Así nadie lo usa de buscador a nuestra costa.
  const consultas = await contar(`direccion-${huellaDe(req)}`, 60);
  if (consultas > 20) {
    return Response.json({
      opciones: [],
      aviso: "Probaste muchas direcciones seguidas. Espera un momento o elige tu distrito de la lista.",
    });
  }

  const encontradas = await buscarDireccion(texto);

  const opciones = encontradas
    .map((d) => {
      const envio = destinoDeCandidatos(d.candidatos);
      return {
        direccion: d.direccion,
        // Si está en la tabla, el nombre de la tienda. Si no, el del
        // distrito, que es lo que la clienta reconoce.
        destino: envio.conocido ? envio.destino : (d.zona ?? envio.destino),
        costo: envio.costo,
        conocido: envio.conocido,
      };
    })
    // Una opción por distrito. El mapa devuelve la misma avenida con
    // tres códigos postales distintos, y tres veces "Miraflores · S/ 10"
    // no es una elección, es ruido.
    .filter(
      (o, i, todas) =>
        todas.findIndex((x) =>
          o.destino ? x.destino === o.destino : x.direccion === o.direccion
        ) === i
    );

  // El mapa no pudo (o no reconoció la zona), pero ella escribió el
  // distrito. Pasa con las direcciones por manzana y lote, que OSM casi
  // no tiene y que aquí son de lo más normal.
  if (!opciones.some((o) => o.conocido)) {
    const escrito = destinoEnTexto(texto);
    if (escrito.conocido) {
      return Response.json({
        opciones: [
          {
            direccion: texto.trim(),
            destino: escrito.destino,
            costo: escrito.costo,
            conocido: true,
            segunTexto: true,
          },
          ...opciones,
        ],
        motor: geocodificadorEnUso(),
      });
    }
  }

  return Response.json({ opciones, motor: geocodificadorEnUso() });
}
