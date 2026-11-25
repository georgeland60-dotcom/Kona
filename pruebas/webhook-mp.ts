// Prueba del aviso de Mercado Pago (webhook), con Mercado Pago simulado.
//   node --experimental-strip-types --import ./pruebas/resolver.mjs pruebas/webhook-mp.ts
import crypto from "crypto";

process.env.MERCADOPAGO_ACCESS_TOKEN = "prueba";
let respuestaMP: { status: number; cuerpo?: unknown } | "red" = { status: 404 };
const fetchReal = globalThis.fetch;
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  if (String(url).includes("/v1/payments/")) {
    if (respuestaMP === "red") throw new Error("sin red");
    return new Response(JSON.stringify(respuestaMP.cuerpo ?? {}), { status: respuestaMP.status });
  }
  return fetchReal(url, init);
}) as typeof fetch;

const { POST } = await import("../src/app/api/pagos/mercadopago/route.ts");

let fallos = 0;
function ver(nombre: string, ok: boolean, extra = "") {
  console.log(`${ok ? "OK " : "MAL"} ${nombre}${extra ? " — " + extra : ""}`);
  if (!ok) fallos++;
}

function aviso(id: string, headers: Record<string, string> = {}) {
  return new Request("https://konamoda.pe/api/pagos/mercadopago?data.id=" + id + "&type=payment", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ type: "payment", data: { id } }),
  });
}

// 1. La prueba del panel: número inventado -> 200 ignorado, sin reintento.
respuestaMP = { status: 404 };
let r = await POST(aviso("123456"));
let j = await r.json();
ver("pago inexistente responde 200", r.status === 200 && j.ignorado === "pago inexistente", JSON.stringify(j));

// 2. Mercado Pago caído -> 500 para que reintente.
respuestaMP = "red";
r = await POST(aviso("123456"));
ver("sin red responde 500 (reintenta)", r.status === 500);

// 3. Mercado Pago responde 401 (clave mala) -> 500, no se traga el aviso.
respuestaMP = { status: 401 };
r = await POST(aviso("123456"));
ver("clave rechazada responde 500", r.status === 500);

// 4. Pago real sin pedido asociado -> 200 ignorado.
respuestaMP = { status: 200, cuerpo: { id: 9, status: "approved", transaction_amount: 10 } };
r = await POST(aviso("9"));
j = await r.json();
ver("pago sin pedido se ignora", r.status === 200 && j.ignorado === "sin pedido", JSON.stringify(j));

// 5. Con secreto: firma buena pasa, firma mala o ausente -> 401.
process.env.MERCADOPAGO_WEBHOOK_SECRET = "secreto-de-prueba";
respuestaMP = { status: 404 };
const ts = "1795650000";
const reqId = "abc-123";
const v1 = crypto.createHmac("sha256", "secreto-de-prueba").update(`id:777;request-id:${reqId};ts:${ts};`).digest("hex");
r = await POST(aviso("777", { "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": reqId }));
ver("firma correcta pasa", r.status === 200);
r = await POST(aviso("777", { "x-signature": `ts=${ts},v1=${"0".repeat(64)}`, "x-request-id": reqId }));
ver("firma falsa se rechaza", r.status === 401);
r = await POST(aviso("777"));
ver("sin firma se rechaza", r.status === 401);

console.log(fallos ? `\n${fallos} fallaron` : "\nTodo bien");
process.exit(fallos ? 1 : 0);
