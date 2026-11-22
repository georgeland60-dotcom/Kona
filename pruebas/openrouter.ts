// Pruebas de la elección de modelo en OpenRouter. Se corre con:
//   node --experimental-strip-types --import ./pruebas/resolver.mjs pruebas/openrouter.ts
//
// No toca red: solo comprueba cómo se lee el tamaño del modelo a partir
// de su nombre, que es lo único frágil de la cadena. Importa porque un
// modelo de 1,7 mil millones contesta vacío cuando hay herramientas, y
// si se cuela como primera opción la clienta se queda sin respuesta.

import { esChico } from "@/lib/agent/openrouter";

const casos: [string, boolean][] = [
  ["liquid/lfm-3-1.7b:free", true],
  ["qwen/qwen3-4b:free", true],
  // Mixtos: 26 mil millones en total, 4 despiertos a la vez. Manda el total.
  ["google/gemma-4-26b-a4b-it:free", false],
  ["google/gemma-4-31b-it:free", false],
  ["meta-llama/llama-4-70b-instruct:free", false],
  ["mistralai/mistral-7b-instruct:free", false],
  ["mistralai/mistral-small-3.2-24b-instruct:free", false],
  // Sin tamaño en el nombre: no se penaliza a ciegas.
  ["deepseek/deepseek-chat-v3:free", false],
  ["google/gemini-2.5-flash-lite:free", false],
];

let fallos = 0;
for (const [id, esperado] of casos) {
  const real = esChico(id);
  if (real !== esperado) {
    console.log(`MAL ${id} -> ${real}, esperaba ${esperado}`);
    fallos++;
  }
}

console.log(
  fallos === 0
    ? `esChico: ${casos.length} casos, todo bien`
    : `esChico: ${fallos} fallos de ${casos.length}`
);
if (fallos > 0) process.exit(1);
