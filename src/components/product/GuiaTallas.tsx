// =============================================================
//  GUÍA DE TALLAS DE LA PRENDA
//
//  Va en la propia ficha, plegada: quien ya sabe su talla no la
//  necesita, y quien duda la tiene a un clic sin salir del producto.
//
//  Lo que más ayuda no es la tabla, es la referencia de la modelo
//  ("mide 1.68 y usa M"), así que va primero.
//
//  Y si la pieza no lleva talla (una cartera, un accesorio), se dice y
//  se acabó: hablar de tallas ahí solo confunde.
// =============================================================

import type { Product } from "@/lib/types";
import { esTallaUnica, guiaDeProducto, modeloEnTexto } from "@/lib/tallas";

export default function GuiaTallas({ product }: { product: Product }) {
  const guia = guiaDeProducto(product);
  const modelo = modeloEnTexto(product);
  const unica = esTallaUnica(product);

  if (unica && !guia) {
    return (
      <p className="mt-4 text-sm text-muted">
        Es de talla única: no tienes que elegir talla. Si quieres saber sus
        medidas exactas, te las pasamos por WhatsApp.
      </p>
    );
  }

  // Sin tabla y sin referencia de la modelo no se despliega nada, pero
  // tampoco se deja a la clienta sin salida: la tabla real de estas
  // prendas (las que van por número, sobre todo) está en sus fotos.
  if (!guia && !modelo) {
    return (
      <p className="mt-4 text-sm text-muted">
        Las medidas de esta prenda están en sus fotos. Si prefieres, te las
        confirmamos por WhatsApp antes de que decidas.
      </p>
    );
  }

  const campos = guia
    ? [...new Set(guia.medidas.flatMap((m) => Object.keys(m.medidas)))]
    : [];

  return (
    <details className="mt-4 border border-line rounded-xl overflow-hidden group">
      <summary className="px-4 py-3 text-sm cursor-pointer select-none flex items-center justify-between">
        <span>
          {unica ? "Medidas de esta pieza" : "Guía de tallas de esta prenda"}
        </span>
        <span className="text-muted text-xs group-open:hidden">ver</span>
      </summary>

      <div className="px-4 pb-4 space-y-3">
        {unica && (
          <p className="text-sm bg-soft rounded-lg px-3 py-2">
            Es de talla única: no tienes que elegir talla.
          </p>
        )}

        {modelo && (
          <p className="text-sm bg-soft rounded-lg px-3 py-2">{modelo}</p>
        )}

        {!guia && (
          <p className="text-sm text-muted">
            Las medidas exactas de esta prenda están en sus fotos. Si
            prefieres, te las confirmamos por WhatsApp antes de que decidas.
          </p>
        )}

        {guia && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted text-left">
                  <tr>
                    <th className="py-1 pr-4 font-medium">Talla</th>
                    {campos.map((c) => (
                      <th key={c} className="py-1 pr-4 font-medium capitalize">
                        {c.replace(/_/g, " ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {guia.medidas.map((m) => (
                    <tr key={m.talla}>
                      <td className="py-1.5 pr-4 font-medium">{m.talla}</td>
                      {campos.map((c) => (
                        <td key={c} className="py-1.5 pr-4">
                          {m.medidas[c] ? `${m.medidas[c]} cm` : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted">{guia.nota}</p>
          </>
        )}
      </div>
    </details>
  );
}
