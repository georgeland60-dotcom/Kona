// =============================================================
//  CONSUMO DE LA IA
//
//  Cuenta cuántas llamadas y cuántos tokens gasta el agente, por día.
//  Sirve para responder con datos y no con estimaciones: "¿cuánto me
//  queda de la cuota gratuita?".
//
//  La capa gratuita de Google no son créditos que se agotan para
//  siempre: son límites POR DÍA que se reinician solos. Por eso lo que
//  interesa es el consumo diario, no un saldo acumulado.
// =============================================================

import { readDoc, writeDoc } from "@/lib/kv";

// Límites de la capa gratuita de Gemini Flash. OJO: cada modelo tiene el
// suyo y Google los cambia sin avisar, así que esto es una referencia
// para el panel, no una verdad absoluta: el que manda es Google, y
// cuando frena una petición lo dice en el mensaje de error. Se puede
// ajustar sin tocar código con GEMINI_LIMITE_DIA.
export const LIMITE_LLAMADAS_DIA = Number(
  process.env.GEMINI_LIMITE_DIA || 1500
);
export const LIMITE_LLAMADAS_MINUTO = 10;

export type DiaDeConsumo = {
  fecha: string; // AAAA-MM-DD
  llamadas: number; // peticiones a la IA
  mensajes: number; // mensajes de Telegram atendidos
  tokensEntrada: number;
  tokensSalida: number;
};

type Consumo = { dias: DiaDeConsumo[] };

// Un mes de historial alcanza y no crece sin control.
const MAX_DIAS = 31;

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

function vacio(): Consumo {
  return { dias: [] };
}

// Suma lo gastado en un mensaje. Nunca debe tumbar al agente: si falla,
// se pierde la estadística, no el cambio que pidió la dueña.
export async function anotarConsumo(datos: {
  llamadas: number;
  tokensEntrada: number;
  tokensSalida: number;
  // false cuando esto es la continuación de un mensaje que ya se contó:
  // un pedido largo son varias tandas, pero un solo mensaje.
  mensajeNuevo?: boolean;
}): Promise<void> {
  try {
    const consumo = await readDoc<Consumo>("consumo", vacio);
    const fecha = hoy();
    const dia = consumo.dias.find((d) => d.fecha === fecha);

    if (dia) {
      dia.llamadas += datos.llamadas;
      if (datos.mensajeNuevo !== false) dia.mensajes += 1;
      dia.tokensEntrada += datos.tokensEntrada;
      dia.tokensSalida += datos.tokensSalida;
    } else {
      consumo.dias.unshift({
        fecha,
        llamadas: datos.llamadas,
        mensajes: datos.mensajeNuevo === false ? 0 : 1,
        tokensEntrada: datos.tokensEntrada,
        tokensSalida: datos.tokensSalida,
      });
    }

    consumo.dias = consumo.dias
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
      .slice(0, MAX_DIAS);
    await writeDoc("consumo", consumo);
  } catch {
    // El contador es un extra: no vale la pena romper nada por él.
  }
}

export async function getConsumo(): Promise<DiaDeConsumo[]> {
  const { dias } = await readDoc<Consumo>("consumo", vacio);
  return dias;
}

export type ResumenConsumo = {
  hoy: DiaDeConsumo;
  porcentajeDelDia: number; // cuánto de la cuota diaria se lleva usado
  llamadasPorMensaje: number; // cuántas llamadas cuesta un cambio, medido
  mensajesQueFaltan: number; // cuántos más caben hoy, al ritmo medido
  diasConDatos: number;
};

export async function resumirConsumo(): Promise<ResumenConsumo> {
  const dias = await getConsumo();
  const fecha = hoy();
  const deHoy = dias.find((d) => d.fecha === fecha) ?? {
    fecha,
    llamadas: 0,
    mensajes: 0,
    tokensEntrada: 0,
    tokensSalida: 0,
  };

  // El promedio se saca de TODO el historial, no solo de hoy: con dos
  // mensajes sueltos el promedio del día no dice nada.
  const totalLlamadas = dias.reduce((s, d) => s + d.llamadas, 0);
  const totalMensajes = dias.reduce((s, d) => s + d.mensajes, 0);
  const llamadasPorMensaje = totalMensajes > 0 ? totalLlamadas / totalMensajes : 0;

  const restantes = Math.max(0, LIMITE_LLAMADAS_DIA - deHoy.llamadas);

  return {
    hoy: deHoy,
    porcentajeDelDia: (deHoy.llamadas / LIMITE_LLAMADAS_DIA) * 100,
    llamadasPorMensaje,
    mensajesQueFaltan:
      llamadasPorMensaje > 0 ? Math.floor(restantes / llamadasPorMensaje) : restantes,
    diasConDatos: dias.length,
  };
}
