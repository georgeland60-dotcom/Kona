// =============================================================
//  "¿DÓNDE QUEDA ESTO?"
//
//  Recibe los tres datos que la clienta rellena —dirección, distrito y
//  provincia— y devuelve dos cosas:
//
//   1. El punto en el mapa, para enseñárselo y que confirme. Una
//      dirección escrita se lee de mil maneras; un punto, no.
//   2. Lo que cuesta llevarle el pedido ahí.
//
//  El precio sale de lo que ELLA eligió en el formulario, no de lo que
//  diga el mapa: quien sabe dónde vive es ella. El mapa solo confirma
//  el punto, y si cree que el distrito es otro, se avisa sin cambiar
//  nada por nuestra cuenta.
// =============================================================

import { buscarDireccion, geocodificadorEnUso } from "@/lib/geocodificador";
import {
  LIMA_Y_CALLAO,
  buscarDestino,
  destinoDelFormulario,
} from "@/lib/envios";
import { huellaDe } from "@/lib/asistente/limites";
import { contar } from "@/lib/kv";

export const maxDuration = 20;

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const direccion = (params.get("direccion") ?? params.get("q") ?? "").trim();
  const distrito = (params.get("distrito") ?? "").trim();
  const provincia = (params.get("provincia") ?? "").trim();

  // El precio no depende del mapa, así que se calcula aunque el mapa
  // falle o no encuentre nada.
  const envio = destinoDelFormulario({ provincia, distrito });

  if (direccion.length < 5) {
    return Response.json({ envio, mapa: null, aviso: null });
  }

  // Tope propio, aparte del de la IA: el mapa es gratis pero de otra
  // gente, y una tienda no necesita más de unas pocas búsquedas por
  // minuto y persona.
  const consultas = await contar(`direccion-${huellaDe(req)}`, 60);
  if (consultas > 20) {
    return Response.json({
      envio,
      mapa: null,
      aviso:
        "Probaste muchas direcciones seguidas. Espera un momento y vuelve a intentarlo.",
    });
  }

  // Se le da al mapa todo lo que ella escribió: con el distrito y la
  // provincia delante acierta mucho más que con la calle sola.
  const consulta = [direccion, distrito, provincia === LIMA_Y_CALLAO ? "Lima" : provincia, "Perú"]
    .filter(Boolean)
    .join(", ");

  const encontradas = await buscarDireccion(consulta);
  const mejor = encontradas.find((d) => d.lat !== undefined && d.lon !== undefined);

  if (!mejor) {
    return Response.json({
      envio,
      mapa: null,
      aviso:
        "No pude ubicar esa dirección exacta en el mapa (pasa con las direcciones por manzana y lote). El envío se calcula igual con tu distrito; si quieres, agrega una referencia.",
    });
  }

  // ¿El mapa cree que esto está en otro distrito? No se cambia nada: se
  // dice, y ella decide. Corregirlo por nuestra cuenta sería cobrarle
  // un precio distinto del que eligió sin avisar.
  const delMapa = mejor.candidatos
    .map((c) => buscarDestino(c))
    .find((d) => d !== null);

  const esperado = provincia === LIMA_Y_CALLAO ? distrito : provincia;
  const discrepa =
    !!delMapa &&
    !!esperado &&
    normalizar(delMapa.nombre) !== normalizar(esperado);

  return Response.json({
    envio,
    mapa: {
      direccion: mejor.direccion,
      lat: mejor.lat,
      lon: mejor.lon,
      zona: delMapa?.nombre ?? mejor.zona ?? null,
    },
    aviso: discrepa
      ? `Ojo: en el mapa esa dirección sale en ${delMapa!.nombre}, no en ${esperado}. Si te equivocaste, corrígelo arriba.`
      : null,
    motor: geocodificadorEnUso(),
  });
}
