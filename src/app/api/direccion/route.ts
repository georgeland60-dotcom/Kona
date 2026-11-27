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

import {
  ubicar,
  geocodificadorEnUso,
  CAJA_LIMA_Y_CALLAO,
} from "@/lib/geocodificador";
import {
  LIMA_Y_CALLAO,
  buscarDestino,
  destinoDelFormulario,
} from "@/lib/envios";
import { huellaDe } from "@/lib/asistente/limites";
import { contar } from "@/lib/kv";

export const maxDuration = 20;

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
  const elegido = provincia === LIMA_Y_CALLAO ? buscarDestino(distrito) : null;
  const encontrado = await ubicar({
    direccion,
    distrito,
    ciudad: provincia === LIMA_Y_CALLAO ? "Lima" : provincia,
    otrosNombres: elegido ? [elegido.nombre, ...(elegido.alias ?? [])] : [],
    // Solo se busca dentro de la provincia elegida (y del distrito: eso
    // lo revisa ubicar). Lo de otro sitio no se enseña.
    caja: provincia === LIMA_Y_CALLAO ? CAJA_LIMA_Y_CALLAO : undefined,
  });

  // Cómo llamar a su zona en los avisos: el distrito que eligió, o la
  // provincia si no eligió distrito.
  const suZona = distrito || provincia || "tu distrito";

  if (!encontrado) {
    return Response.json({
      envio,
      mapa: null,
      aviso: `No encontré esa dirección en ${suZona}. Revisa que la calle esté bien escrita; el envío se calcula igual con tu distrito.`,
    });
  }

  const { lugar: mejor, precision } = encontrado;

  // Todo lo que llega aquí ya cae en su distrito, así que el distrito
  // del mapa es el suyo.
  const delMapa = buscarDestino(distrito);

  // Se dice con qué precisión se encontró: marcar la cuadra no es lo
  // mismo que marcar el portal, y callarlo haría que confiara de más.
  const porPrecision: Record<string, string | null> = {
    exacta: null,
    calle: "Encontré tu calle pero no el número: el punto puede estar a unas cuadras de tu casa. Arrástralo hasta tu puerta.",
    zona: `No encontré esa calle en ${suZona}. Te muestro ${suZona}: arrastra el pin hasta tu casa o añade una referencia para quien reparte.`,
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
    aviso: porPrecision[precision],
    motor: geocodificadorEnUso(),
  });
}
