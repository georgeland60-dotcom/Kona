// Pago directo por Yape/Plin o transferencia: el número provisional y
// cómo se nombra en el panel.
//   node --experimental-strip-types --import ./pruebas/resolver.mjs pruebas/pago-directo.ts
import {
  conNumeroProvisional,
  getDatosDePago,
  guardarDatosDePago,
  hayDatosDePago,
} from "../src/lib/pagos-data.ts";
import { promises as fs } from "fs";
import { metodoSugerido, nombreDelMetodo } from "../src/lib/pedido-metodo.ts";

let fallos = 0;
const ver = (nombre: string, ok: boolean, extra = "") => {
  console.log(`${ok ? "OK " : "MAL"} ${nombre}${extra ? " — " + extra : ""}`);
  if (!ok) fallos++;
};

// --- Número provisional -------------------------------------------
const vacio = conNumeroProvisional({});
ver("sin datos: Yape provisional al WhatsApp", vacio.provisional === true && vacio.yape?.numero === "942187981", JSON.stringify(vacio));

const soloBanco = conNumeroProvisional({ banco: { banco: "BCP", tipo: "Ahorros", numero: "123", titular: "X" } });
ver("solo banco: igual hay Yape provisional y se queda el banco", soloBanco.provisional === true && soloBanco.banco?.numero === "123");

const conYape = conNumeroProvisional({ yape: { numero: "999111222", titular: "Ana" } });
ver("con Yape cargado: manda el real", !conYape.provisional && conYape.yape?.numero === "999111222");

const conPlin = conNumeroProvisional({ plin: { numero: "999333444", titular: "Ana" } });
ver("solo Plin cargado: no inventa Yape", !conPlin.provisional && !conPlin.yape);

// --- Nombres en el panel ------------------------------------------
ver("panel: yape-plin", nombreDelMetodo({ method: "transferencia", pagoElegido: "yape-plin" }) === "Yape / Plin");
ver("panel: transferencia", nombreDelMetodo({ method: "transferencia", pagoElegido: "transferencia" }) === "Transferencia");
ver("panel: pedido viejo sin elección", nombreDelMetodo({ method: "transferencia" }) === "Yape / Plin / transferencia");
ver("registrar pago sugiere yape", metodoSugerido({ pagoElegido: "yape-plin" }) === "yape");
ver("registrar pago sugiere transferencia", metodoSugerido({ pagoElegido: "transferencia" }) === "transferencia");

// --- Varias cuentas (datos inventados) ---------------------------
// Usa la carpeta data/ local, como la tienda sin Upstash.
await fs.mkdir("data", { recursive: true });
const archivo = "data/datos-pago.json";
const habia = await fs.readFile(archivo, "utf8").catch(() => null);

await fs.writeFile(archivo, JSON.stringify({ banco: { banco: "BCP", tipo: "Ahorro", numero: "111", titular: "Ana" } }));
let d = await getDatosDePago();
ver("una cuenta guardada al estilo viejo se lee como lista", d.bancos?.length === 1 && d.bancos[0].numero === "111" && !d.banco, JSON.stringify(d));
ver("y cuenta como datos cargados", hayDatosDePago(d));

await guardarDatosDePago({
  bancos: [
    { banco: "Interbank", tipo: "Ahorro soles", numero: " 222 ", cci: "333", titular: "Ana" },
    { banco: "", tipo: "", numero: "", titular: "" },
    { banco: "BCP", tipo: "Ahorro soles", numero: "444", titular: "Ana" },
  ],
  provinciaSoloYapePlin: true,
});
d = await getDatosDePago();
ver("se guardan solo las cuentas con número, limpias", d.bancos?.length === 2 && d.bancos[0].numero === "222" && d.bancos[1].banco === "BCP", JSON.stringify(d.bancos));
ver("regla de provincia guardada", d.provinciaSoloYapePlin === true);
await guardarDatosDePago({ bancos: [] });
d = await getDatosDePago();
ver("vaciar los números borra las cuentas y la regla", !d.bancos && !d.provinciaSoloYapePlin);

if (habia === null) await fs.rm(archivo); else await fs.writeFile(archivo, habia);

// (Que el pedido guarde la elección se prueba con la tienda corriendo:
// la ruta /api/orders necesita Next para cargarse.)

console.log(fallos ? `\n${fallos} fallaron` : "\nTodo bien");
process.exit(fallos ? 1 : 0);
