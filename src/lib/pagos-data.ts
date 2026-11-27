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

import { leerDoc, writeDoc } from "@/lib/kv";
import { store } from "@/config/store";

export type CuentaBanco = {
  banco: string; // BCP, Interbank...
  tipo: string; // "Ahorro soles"
  numero: string;
  cci?: string;
  titular: string;
};

// Hasta cuántas cuentas se pueden cargar. Más de esto ya no se lee en
// un celular.
export const MAX_CUENTAS = 6;

export type DatosDePago = {
  yape?: { numero: string; titular: string };
  plin?: { numero: string; titular: string };
  // Las cuentas para transferencia. Antes había una sola (`banco`); los
  // datos guardados así se siguen leyendo como una lista de una.
  bancos?: CuentaBanco[];
  /** @deprecated una sola cuenta, de antes del 27 nov 2026. */
  banco?: CuentaBanco;
  // true = a provincia solo se cobra por Yape o Plin: la transferencia
  // bancaria no se ofrece cuando el envío es fuera de Lima y Callao.
  provinciaSoloYapePlin?: boolean;
  // Una línea más que quiera decirle a quien paga ("pon tu nombre en el
  // concepto"). Opcional.
  nota?: string;
  // Ya se guardó alguna vez a propósito (desde el panel o con la carga
  // inicial). Sin esta marca, un registro vacío de antes no impide la
  // carga inicial; con ella, vaciar el panel se respeta.
  administrado?: boolean;
};

function vacio(): DatosDePago {
  return {};
}

// Lo guardado, con las cuentas siempre como lista.
function normalizar(datos: DatosDePago): DatosDePago {
  const { banco, ...resto } = datos;
  const bancos = datos.bancos ?? (banco?.numero ? [banco] : []);
  return { ...resto, ...(bancos.length ? { bancos } : {}) };
}

// La primera carga puede venir de Vercel (DATOS_PAGO_INICIALES, un JSON
// con la misma forma que DatosDePago), para no tener que teclear las
// cuentas en el panel y SIN ponerlas en el código, que es público. Se
// usa una sola vez: solo si todavía no hay nada guardado. Desde ahí
// manda lo que se guarde en el panel, incluso si se vacía.
function semilla(): DatosDePago | null {
  const crudo = process.env.DATOS_PAGO_INICIALES?.trim();
  if (!crudo) return null;
  try {
    return JSON.parse(crudo) as DatosDePago;
  } catch {
    console.log("[pagos] DATOS_PAGO_INICIALES no es un JSON válido");
    return null;
  }
}

export async function getDatosDePago(): Promise<DatosDePago> {
  const leido = await leerDoc<DatosDePago>("datos-pago");
  if (leido.ok && (leido.valor.administrado || hayDatosDePago(leido.valor))) {
    return normalizar(leido.valor);
  }
  // Si la base falló, no se siembra nada encima: se muestra vacío y
  // se reintenta en la siguiente visita.
  if (!leido.ok && leido.motivo === "error") return vacio();

  const inicial = semilla();
  if (!inicial) return vacio();
  await guardarDatosDePago(inicial);
  const guardado = await leerDoc<DatosDePago>("datos-pago");
  return guardado.ok ? normalizar(guardado.valor) : normalizar(inicial);
}

// ¿Hay algo que enseñar? Si no se cargó nada, la tienda no puede
// prometer "paga por Yape": no sabe a qué número.
export function hayDatosDePago(datos: DatosDePago): boolean {
  return !!(
    datos.yape?.numero ||
    datos.plin?.numero ||
    datos.bancos?.some((b) => b.numero) ||
    datos.banco?.numero
  );
}

// Lo que ve quien va a pagar. Mientras la dueña no cargue sus números
// en /admin/pagos, Yape y Plin se ofrecen al celular del WhatsApp del
// negocio (decidido el 26 nov 2026, hasta que la titular confirme los
// suyos). En cuanto haya un Yape o un Plin cargado, manda ese y el
// provisional desaparece solo.
export type DatosParaPagar = DatosDePago & { provisional?: boolean };

export function conNumeroProvisional(datos: DatosDePago): DatosParaPagar {
  if (datos.yape?.numero || datos.plin?.numero) return datos;
  const celular = store.whatsapp.replace(/^51(?=\d{9}$)/, "");
  return { ...datos, yape: { numero: celular, titular: "" }, provisional: true };
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
  const cuentas = (datos.bancos ?? [])
    .filter((b) => b.numero?.trim())
    .slice(0, MAX_CUENTAS)
    .map((b) => ({
      banco: (b.banco ?? "").trim(),
      tipo: (b.tipo ?? "").trim(),
      numero: b.numero.trim(),
      ...(b.cci?.trim() ? { cci: b.cci.trim() } : {}),
      titular: (b.titular ?? "").trim(),
    }));
  if (cuentas.length) limpio.bancos = cuentas;
  if (datos.provinciaSoloYapePlin) limpio.provinciaSoloYapePlin = true;
  if (datos.nota?.trim()) limpio.nota = datos.nota.trim().slice(0, 300);
  limpio.administrado = true;

  await writeDoc("datos-pago", limpio);
}
