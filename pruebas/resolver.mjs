// Para poder probar código de src/ con node a secas.
//
// Next entiende "@/lib/envios" y los imports sin extensión; node no.
// Este resolvedor traduce las dos cosas, así que las pruebas importan
// exactamente los mismos archivos que usa la web, sin copias ni
// adaptadores que luego se desincronizan.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const raiz = pathToFileURL(new URL("../", import.meta.url).pathname).href;

register(
  "data:text/javascript," +
    encodeURIComponent(`
      const raiz = ${JSON.stringify(raiz)};
      export async function resolve(especificador, contexto, siguiente) {
        let destino = especificador;
        if (destino.startsWith("@/")) {
          destino = new URL("src/" + destino.slice(2), raiz).href;
        }
        if (/^(\\.|file:|\\/)/.test(destino) && !/\\.[a-z]+$/i.test(destino)) {
          const base = destino.startsWith(".")
            ? new URL(destino, contexto.parentURL).href
            : destino;
          try {
            return await siguiente(base + ".ts", contexto);
          } catch {
            return await siguiente(base + ".tsx", contexto);
          }
        }
        return siguiente(destino, contexto);
      }
    `),
  import.meta.url
);
