// =============================================================
//  "¿QUÉ DIRECCIÓN ES ESTA?"
//
//  Recibe el punto que dio la clienta (su GPS o un enlace de Google
//  Maps) y devuelve la provincia, el distrito y la calle tal como los
//  pide el formulario, para rellenárselos. Es una propuesta: el mapa
//  puede no saber el número, o llamar a la calle de otra forma, así que
//  ella lo revisa.
// =============================================================

import { puntoValido, queHayAqui } from "@/lib/geocodificador";
import { LIMA_Y_CALLAO, buscarDestino } from "@/lib/envios";
import { huellaDe } from "@/lib/asistente/limites";
import { contar } from "@/lib/kv";

export const maxDuration = 15;

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const punto = puntoValido(Number(params.get("lat")), Number(params.get("lon")));
  if (!punto) return Response.json({ entrega: null });

  if ((await contar(`punto-${huellaDe(req)}`, 60)) > 20) {
    return Response.json({ entrega: null });
  }

  const aqui = await queHayAqui(punto.lat, punto.lon);
  if (!aqui) return Response.json({ entrega: null });

  let provincia = "";
  let distrito = "";

  if (aqui.enLima) {
    provincia = LIMA_Y_CALLAO;
    // El Cercado sale en el mapa como "Lima" a secas.
    const lugares = aqui.lugares.map((l) => (/^lima$/i.test(l.trim()) ? "Lima Cercado" : l));
    const destino = lugares
      .map((l) => buscarDestino(l))
      .find((d) => d !== null && d.zona === "Lima");
    distrito = destino?.nombre ?? "";
  } else {
    // En provincia el formulario pide la provincia de la lista y el
    // distrito escrito a mano.
    const destino = [...aqui.regiones, ...aqui.lugares]
      .map((l) => buscarDestino(l))
      .find((d) => d !== null && d.zona === "Provincia");
    provincia = destino?.nombre ?? "";
    distrito = aqui.lugares.at(-1) ?? "";
  }

  return Response.json({
    entrega: { provincia, distrito, direccion: aqui.calle },
  });
}
