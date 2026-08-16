// =============================================================
//  PLANES PENDIENTES DE CONFIRMAR
//
//  Entre que el agente propone los cambios y la dueña aprieta
//  "Confirmar" pasan unos segundos, y en el medio el servidor puede
//  haber atendido otra cosa. Por eso el plan se guarda aquí, con un
//  código corto que viaja en el botón de Telegram.
//
//  Los planes viejos (más de 1 hora) se limpian solos.
// =============================================================

import crypto from "crypto";
import { readDoc, writeDoc } from "@/lib/kv";
import type { AccionPlan } from "@/lib/agent/run";

const VIGENCIA_MS = 60 * 60 * 1000; // 1 hora

type Pendiente = {
  chatId: number;
  acciones: AccionPlan[];
  creadoEn: number;
  pedidoPor?: string; // quién lo pidió (útil cuando el grupo tiene 2 personas)
};

type Almacen = { pendientes: Record<string, Pendiente> };

function vacio(): Almacen {
  return { pendientes: {} };
}

// Quita los planes caducados para que el archivo no crezca sin control.
function limpiar(almacen: Almacen): Almacen {
  const limite = Date.now() - VIGENCIA_MS;
  const pendientes: Record<string, Pendiente> = {};
  for (const [id, p] of Object.entries(almacen.pendientes)) {
    if (p.creadoEn > limite) pendientes[id] = p;
  }
  return { pendientes };
}

// Guarda un plan y devuelve el código corto que va en los botones.
// Devuelve null si NO se pudo guardar: sin base de datos configurada el
// plan se perdería y el botón "Confirmar" fallaría al apretarlo. Es mejor
// decirlo de frente que mostrar un botón que no va a funcionar.
export async function guardarPlan(
  chatId: number,
  acciones: AccionPlan[],
  pedidoPor?: string
): Promise<string | null> {
  const almacen = limpiar(await readDoc<Almacen>("agente-pendientes", vacio));
  // 8 caracteres: los botones de Telegram admiten poco texto.
  const codigo = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  almacen.pendientes[codigo] = {
    chatId,
    acciones,
    creadoEn: Date.now(),
    pedidoPor,
  };
  const guardado = await writeDoc("agente-pendientes", almacen);
  return guardado ? codigo : null;
}

// Recupera un plan y lo borra (para que no se pueda aplicar dos veces).
export async function tomarPlan(
  codigo: string,
  chatId: number
): Promise<AccionPlan[] | null> {
  const almacen = limpiar(await readDoc<Almacen>("agente-pendientes", vacio));
  const pendiente = almacen.pendientes[codigo];
  if (!pendiente || pendiente.chatId !== chatId) return null;

  delete almacen.pendientes[codigo];
  await writeDoc("agente-pendientes", almacen);
  return pendiente.acciones;
}

// Descarta un plan sin ejecutarlo.
export async function descartarPlan(codigo: string): Promise<void> {
  const almacen = limpiar(await readDoc<Almacen>("agente-pendientes", vacio));
  delete almacen.pendientes[codigo];
  await writeDoc("agente-pendientes", almacen);
}
