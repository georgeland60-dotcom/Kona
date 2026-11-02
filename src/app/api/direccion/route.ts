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

import { ubicar, geocodificadorEnUso } from "@/lib/geocodificador";
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

  // Se busca de lo más preciso a lo más general: la dirección entera,
  // la calle sin número y, si no, la zona. En Perú muchísimas calles
  // están mapeadas pero sus números no, así que buscar solo con el
  // número puesto devolvía nada y parecía que la calle no existía.
  const encontrado = await ubicar({
    direccion,
    distrito,
    ciudad: provincia === LIMA_Y_CALLAO ? "Lima" : provincia,
  });

  if (!encontrado) {
    return Response.json({
      envio,
      mapa: null,
      aviso:
        "No pude ubicar esa dirección en el mapa. El envío se calcula igual con tu distrito.",
    });
  }

  const { lugar: mejor, precision } = encontrado;

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

  // Se dice con qué precisión se encontró: marcar la cuadra no es lo
  // mismo que marcar el portal, y callarlo haría que confiara de más.
  const porPrecision: Record<string, string | null> = {
    exacta: null,
    calle: "Encontré la calle pero no el número: el punto marca la cuadra, no el portal.",
    zona: "No pude ubicar la calle, así que el mapa muestra tu distrito. Añade una referencia para quien reparte.",
  };

  return Response.json({
    envio,
    mapa: {
      direccion: mejor.direccion,
      lat: mejor.lat,
      lon: mejor.lon,
      zona: delMapa?.nombre ?? mejor.zona ?? null,
      precision,
    },
    aviso: discrepa
      ? `Ojo: en el mapa esa dirección sale en ${delMapa!.nombre}, no en ${esperado}. Si te equivocaste, corrígelo arriba.`
      : porPrecision[precision],
    motor: geocodificadorEnUso(),
  });
}
