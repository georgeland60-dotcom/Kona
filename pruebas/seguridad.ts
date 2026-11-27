// Pruebas de las protecciones de la revisión de seguridad (27 nov 2026).
//   node --experimental-strip-types --import ./pruebas/resolver.mjs pruebas/seguridad.ts
//
// Sin base KV: el contador usa el disco (carpeta data/ temporal).
import { promises as fs } from "fs";
import os from "os";
import path from "path";

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "kona-seg-"));
process.chdir(tmp);
delete process.env.KV_REST_API_URL;
delete process.env.UPSTASH_REDIS_REST_URL;

let fallos = 0;
function ver(nombre: string, ok: boolean, extra = "") {
  console.log(`${ok ? "OK " : "MAL"} ${nombre}${extra ? " — " + extra : ""}`);
  if (!ok) fallos++;
}

// ---- 1. Fuerza bruta contra el panel ---------------------------------
const { permitirIntento, limpiarIp, INTENTOS_POR_VENTANA } = await import(
  "../src/lib/intentos-login.ts"
);

let permitidos = 0;
for (let i = 0; i < INTENTOS_POR_VENTANA + 5; i++) {
  if (await permitirIntento("203.0.113.7")) permitidos++;
}
ver("una IP solo tiene N intentos por ventana", permitidos === INTENTOS_POR_VENTANA, `${permitidos}`);
ver("otra IP no queda bloqueada por la primera", await permitirIntento("198.51.100.1"));
ver("la IP sale de la primera de x-forwarded-for", limpiarIp("1.2.3.4, 10.0.0.1") === "1.2.3.4");
ver("una cabecera maliciosa no ensucia la clave", !/[/\s:*]/.test(limpiarIp("1.2.3.4/../../x *")) || limpiarIp("a b*/c") === "abc");
ver("sin cabecera, valor fijo", limpiarIp(null) === "desconocida");

// ---- 2. Excel no ejecuta lo que escribe una clienta -------------------
const { celda } = await import("../src/lib/csv.ts");
ver("fórmula con = se neutraliza", celda("=HYPERLINK(\"http://x\")").startsWith("\"'="));
ver("fórmula con + se neutraliza", celda("+51 999") === "'+51 999");
ver("fórmula con @ se neutraliza", celda("@SUM(A1)") === "'@SUM(A1)");
ver("un nombre normal queda igual", celda("Ana Pérez") === "Ana Pérez");
ver("un número negativo queda igual", celda(-5) === "-5" && celda("-5") === "-5");
ver("comas y ; se siguen entrecomillando", celda("a;b") === "\"a;b\"");

// ---- 3. Cabeceras de seguridad en toda la tienda ----------------------
const { default: config } = await import("../next.config.ts");
ver("no anuncia x-powered-by", config.poweredByHeader === false);
const reglas = (await config.headers?.()) ?? [];
const todas = reglas.find((r) => r.source === "/:path*");
const valor = (k: string) => todas?.headers.find((h) => h.key === k)?.value;
ver("cabeceras para todas las rutas", !!todas);
ver("no se puede meter en un marco", valor("X-Frame-Options") === "DENY");
ver("frame-ancestors 'none'", valor("Content-Security-Policy") === "frame-ancestors 'none'");
ver("nosniff", valor("X-Content-Type-Options") === "nosniff");
ver("la ubicación sigue permitida para la tienda", /geolocation=\(self\)/.test(valor("Permissions-Policy") ?? ""));

await fs.rm(tmp, { recursive: true, force: true });
console.log(fallos === 0 ? "\nTodo bien." : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
