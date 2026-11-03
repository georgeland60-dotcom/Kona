// =============================================================
//  A DÓNDE PAGA LA CLIENTA
//
//  El número de Yape, el de Plin y la cuenta del banco. Van en la base
//  y no en el código a propósito: son datos que cambian (se cambia de
//  cuenta, se añade Plin) y que tiene que poder tocar la dueña sin que
//  nadie despliegue nada.
//
//  Son datos PÚBLICOS: es lo que se le enseña a quien va a pagar. No
//  hay contraseñas ni claves aquí, y no las habrá: para cobrar basta
//  con el número, y un dato que no se guarda no se puede filtrar.
// =============================================================

import { readDoc, writeDoc } from "@/lib/kv";

export type DatosDePago = {
  yape?: { numero: string; titular: string };
  plin?: { numero: string; titular: string };
  banco?: {
    banco: string; // BCP, Interbank...
    tipo: string; // "Cuenta de ahorros soles"
    numero: string;
    cci?: string;
    titular: string;
  };
  // Una línea más que quiera decirle a quien paga ("pon tu nombre en el
  // concepto"). Opcional.
  nota?: string;
};

function vacio(): DatosDePago {
  return {};
}

export async function getDatosDePago(): Promise<DatosDePago> {
  return readDoc<DatosDePago>("datos-pago", vacio);
}

// ¿Hay algo que enseñar? Si no se cargó nada, la tienda no puede
// prometer "paga por Yape": no sabe a qué número.
export function hayDatosDePago(datos: DatosDePago): boolean {
  return !!(datos.yape?.numero || datos.plin?.numero || datos.banco?.numero);
}

export async function guardarDatosDePago(datos: DatosDePago): Promise<void> {
  // Se guarda solo lo que tiene número: media ficha a medio llenar
  // confunde más que no tenerla.
  const limpio: DatosDePago = {};
  if (datos.yape?.numero?.trim()) {
    limpio.yape = {
      numero: datos.yape.numero.trim(),
      titular: (datos.yape.titular ?? "").trim(),
    };
  }
  if (datos.plin?.numero?.trim()) {
    limpio.plin = {
      numero: datos.plin.numero.trim(),
      titular: (datos.plin.titular ?? "").trim(),
    };
  }
  if (datos.banco?.numero?.trim()) {
    limpio.banco = {
      banco: (datos.banco.banco ?? "").trim(),
      tipo: (datos.banco.tipo ?? "").trim(),
      numero: datos.banco.numero.trim(),
      ...(datos.banco.cci?.trim() ? { cci: datos.banco.cci.trim() } : {}),
      titular: (datos.banco.titular ?? "").trim(),
    };
  }
  if (datos.nota?.trim()) limpio.nota = datos.nota.trim().slice(0, 300);

  await writeDoc("datos-pago", limpio);
}
