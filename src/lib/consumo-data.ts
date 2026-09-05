// =============================================================
//  CONSUMO DE LA IA
//
//  Cuenta cuántas llamadas y cuántos tokens gasta el agente, por día.
//  Sirve para responder con datos y no con estimaciones: "¿cuánto llevo
//  consumido hoy?".
//
//  Los límites de Google no son créditos que se agotan para siempre: son
//  topes POR DÍA que se reinician solos. Por eso lo que interesa es el
//  consumo diario, no un saldo acumulado.
// =============================================================

import { readDoc, writeDoc } from "@/lib/kv";
import { hoyEnLima } from "@/lib/fechas";

// El tope diario de cada modelo NO se pone aquí a mano: Google no lo
// publica y varía según el modelo, así que cualquier número escrito
// aquí sería inventado. Se MIDE: el día que Google corta un modelo, lo
// consumido hasta ese momento es su tope real (ver modelos.ts).

export type DiaDeConsumo = {
  fecha: string; // AAAA-MM-DD
  llamadas: number; // peticiones a la IA (intentos, hayan salido bien o no)
  mensajes: number; // mensajes de Telegram atendidos
  tokensEntrada: number;
  tokensSalida: number;
  // Veces que Google nos frenó por límite de uso. Esto es lo único que
  // dice la verdad sobre la cuota: nuestro contador cuenta lo que pedimos
  // nosotros, pero el cupo lo lleva Google por su cuenta y su límite
  // depende del modelo. Sin esto, el panel puede marcar "0,3% usado"
  // mientras el bot dice que se acabó, y no hay forma de entenderlo.
  frenos?: number;
  ultimoFreno?: {
    cuando: string; // ISO
    porDia: boolean; // true = cupo del día; false = límite por minuto
    detalle: string; // lo que dijo Google, textual
    modelo?: string;
  };
  // Desglose por modelo. El límite de Google es POR MODELO, así que
  // el total del día no dice gran cosa: lo que importa es cuánto se le
  // pidió a CADA uno, sobre todo desde que el agente cambia de modelo
  // solo cuando uno se queda sin cupo.
  porModelo?: Record<
    string,
    {
      llamadas: number;
      tokensEntrada: number;
      tokensSalida: number;
      frenos?: number;
    }
  >;
};

type Consumo = { dias: DiaDeConsumo[] };

// Un mes de historial alcanza y no crece sin control.
const MAX_DIAS = 31;

// El día de la TIENDA, en hora de Perú. Con la fecha en UTC, "lo de hoy"
// cambiaba a las 7 de la tarde de Lima: a esa hora el contador se ponía
// en cero y el día siguiente aparecía con consumo antes de empezar.
function hoy(): string {
  return hoyEnLima();
}

function vacio(): Consumo {
  return { dias: [] };
}

// Suma lo gastado en un mensaje. Nunca debe tumbar al agente: si falla,
// se pierde la estadística, no el cambio que pidió la dueña.
type GastoModelo = {
  llamadas: number;
  tokensEntrada: number;
  tokensSalida: number;
};

// Suma en el día lo gastado por un modelo concreto.
function sumarModelo(
  dia: DiaDeConsumo,
  modelo: string,
  datos: Partial<GastoModelo> & { frenos?: number }
): void {
  if (!dia.porModelo) dia.porModelo = {};
  const actual = dia.porModelo[modelo] ?? {
    llamadas: 0,
    tokensEntrada: 0,
    tokensSalida: 0,
  };
  actual.llamadas += datos.llamadas ?? 0;
  actual.tokensEntrada += datos.tokensEntrada ?? 0;
  actual.tokensSalida += datos.tokensSalida ?? 0;
  if (datos.frenos) actual.frenos = (actual.frenos ?? 0) + datos.frenos;
  dia.porModelo[modelo] = actual;
}

export async function anotarConsumo(datos: {
  llamadas: number;
  tokensEntrada: number;
  tokensSalida: number;
  // false cuando esto es la continuación de un mensaje que ya se contó:
  // un pedido largo son varias tandas, pero un solo mensaje.
  mensajeNuevo?: boolean;
  porModelo?: Record<string, GastoModelo>;
}): Promise<void> {
  try {
    const consumo = await readDoc<Consumo>("consumo", vacio);
    const fecha = hoy();
    const dia = consumo.dias.find((d) => d.fecha === fecha);

    let elDia = dia;
    if (!elDia) {
      elDia = {
        fecha,
        llamadas: 0,
        mensajes: 0,
        tokensEntrada: 0,
        tokensSalida: 0,
      };
      consumo.dias.unshift(elDia);
    }

    elDia.llamadas += datos.llamadas;
    if (datos.mensajeNuevo !== false) elDia.mensajes += 1;
    elDia.tokensEntrada += datos.tokensEntrada;
    elDia.tokensSalida += datos.tokensSalida;

    for (const [modelo, g] of Object.entries(datos.porModelo ?? {})) {
      sumarModelo(elDia, modelo, g);
    }

    consumo.dias = consumo.dias
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
      .slice(0, MAX_DIAS);
    await writeDoc("consumo", consumo);
  } catch {
    // El contador es un extra: no vale la pena romper nada por él.
  }
}

// Anota que Google nos frenó. Se guarda aparte del consumo porque
// responde a otra pregunta: no "cuánto llevo gastado" sino "¿me está
// frenando Google, y por qué?".
export async function anotarFreno(datos: {
  porDia: boolean;
  detalle: string;
  modelo?: string;
  // true cuando nadie más va a contar este intento: pasa cuando el corte
  // se maneja por dentro (se cambia de modelo y el pedido sigue), así que
  // el error no llega a quien lleva la cuenta. Sin esto, las consultas
  // frenadas no aparecerían y el tope medido saldría corto.
  contarConsulta?: boolean;
}): Promise<void> {
  try {
    const consumo = await readDoc<Consumo>("consumo", vacio);
    const fecha = hoy();
    let dia = consumo.dias.find((d) => d.fecha === fecha);

    if (!dia) {
      dia = {
        fecha,
        llamadas: 0,
        mensajes: 0,
        tokensEntrada: 0,
        tokensSalida: 0,
      };
      consumo.dias.unshift(dia);
    }

    dia.frenos = (dia.frenos ?? 0) + 1;
    if (datos.contarConsulta) dia.llamadas += 1;
    dia.ultimoFreno = {
      cuando: new Date().toISOString(),
      porDia: datos.porDia,
      detalle: datos.detalle.slice(0, 300),
      modelo: datos.modelo,
    };
    if (datos.modelo) {
      sumarModelo(dia, datos.modelo, {
        frenos: 1,
        ...(datos.contarConsulta ? { llamadas: 1 } : {}),
      });
    }

    consumo.dias = consumo.dias
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
      .slice(0, MAX_DIAS);
    await writeDoc("consumo", consumo);
  } catch {
    // Igual que el contador: es un extra, no puede romper nada.
  }
}

export async function getConsumo(): Promise<DiaDeConsumo[]> {
  const { dias } = await readDoc<Consumo>("consumo", vacio);
  return dias;
}

export type ResumenConsumo = {
  hoy: DiaDeConsumo;
  llamadasPorMensaje: number; // cuántas consultas cuesta un cambio, medido
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

  return {
    hoy: deHoy,
    llamadasPorMensaje,
    diasConDatos: dias.length,
  };
}

// Cuántas consultas se le hicieron HOY a un modelo, sin contar las que
// Google frenó (esas no las atendió). Es el número que sirve para medir
// su tope real.
export async function consultasAtendidasHoy(
  modelo: string
): Promise<number> {
  const dias = await getConsumo();
  const uso = dias.find((d) => d.fecha === hoy())?.porModelo?.[modelo];
  if (!uso) return 0;
  return Math.max(0, uso.llamadas - (uso.frenos ?? 0));
}
