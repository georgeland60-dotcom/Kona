// =============================================================
//  ¿CONTESTA LA IA DESDE AQUÍ?
//
//  Una comprobación que corre al terminar de construir la tienda. Sirve
//  para una cosa concreta: saber si la clave de OpenRouter funciona
//  DESDE EL SERVIDOR donde vive la tienda, que es lo único que no se
//  puede probar desde fuera.
//
//  Reglas que se respetan sí o sí:
//   - NUNCA falla el despliegue. Pase lo que pase, termina en 0: una
//     tienda no se queda sin desplegar porque un diagnóstico no pudo
//     hablar con nadie.
//   - NUNCA imprime la clave. Solo si existe y qué contestó el modelo.
// =============================================================

const BASE = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const clave = process.env.OPENROUTER_API_KEY;

const decir = (...partes) => console.log("[probar-ia]", ...partes);

try {
  if (!clave) {
    decir("no hay OPENROUTER_API_KEY en este entorno; no hay nada que probar");
    process.exit(0);
  }
  decir(`clave presente (${clave.slice(0, 8)}…, ${clave.length} caracteres)`);

  const lista = await fetch(`${BASE}/models`, {
    signal: AbortSignal.timeout(10_000),
  });
  decir("GET /models ->", lista.status);

  const datos = lista.ok ? await lista.json() : { data: [] };
  const gratis = (datos.data ?? []).filter((m) => m.id?.endsWith(":free"));
  const conHerramientas = gratis.filter((m) =>
    (m.supported_parameters ?? []).includes("tools")
  );
  decir(
    `modelos: ${(datos.data ?? []).length} en total, ${gratis.length} gratis, ${conHerramientas.length} con herramientas`
  );

  const preferidas = ["gemini", "gemma", "llama", "qwen", "mistral", "deepseek"];
  const puntos = (m) => {
    const i = preferidas.findIndex((p) => m.id.toLowerCase().includes(p));
    return i === -1 ? preferidas.length : i;
  };
  const elegidos = conHerramientas.sort((a, b) => puntos(a) - puntos(b)).slice(0, 3);
  decir("candidatos:", elegidos.map((m) => m.id).join(", ") || "(ninguno)");

  for (const modelo of elegidos) {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${clave}`,
        "content-type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://konamoda.pe",
        "X-Title": "Kona Moda",
      },
      body: JSON.stringify({
        model: modelo.id,
        messages: [
          { role: "system", content: "Responde en una sola palabra." },
          { role: "user", content: "¿Estás ahí?" },
        ],
        max_tokens: 16,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    const texto = await res.text();
    if (!res.ok) {
      decir(`${modelo.id} -> ${res.status}: ${texto.slice(0, 200)}`);
      continue;
    }
    const j = JSON.parse(texto);
    decir(
      `${modelo.id} -> OK · dijo: ${JSON.stringify(j.choices?.[0]?.message?.content ?? "")} · tokens ${j.usage?.prompt_tokens}/${j.usage?.completion_tokens}`
    );
    break;
  }

  const cuota = await fetch(`${BASE}/key`, {
    headers: { authorization: `Bearer ${clave}` },
    signal: AbortSignal.timeout(10_000),
  });
  decir("GET /key ->", cuota.status, (await cuota.text()).slice(0, 300));
} catch (error) {
  decir("falló la comprobación:", error?.message ?? String(error));
} finally {
  process.exit(0);
}
