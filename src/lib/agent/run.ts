// =============================================================
//  EL AGENTE EN SÍ
//
//  Recibe lo que mandó la dueña (texto y/o audio) y devuelve una de
//  estas dos cosas:
//   - una respuesta hablada (cuando solo pregunta o saluda), o
//   - un PLAN: la lista de cambios que haría, para confirmar.
//
//  Regla de oro: el agente NUNCA aplica cambios por su cuenta. Las
//  herramientas de lectura sí corren solas (para que se entere de qué
//  productos existen), pero todo lo que toca precios o catálogo queda
//  anotado y espera el botón "Confirmar".
// =============================================================

import {
  preguntarAlModelo,
  ErrorAgente,
  type Mensaje,
  type Parte,
} from "@/lib/agent/gemini";
import { construirInstruccion } from "@/lib/agent/prompt";
import {
  buscarHerramienta,
  declaracionesParaModelo,
  type ToolArgs,
} from "@/lib/agent/tools";

// Una acción pendiente de confirmar.
export type AccionPlan = {
  herramienta: string;
  args: ToolArgs;
  resumen: string; // en cristiano, para mostrarle a la dueña
};

// Lo que costó atender el mensaje, sumando todas las idas y vueltas.
export type GastoAgente = {
  llamadas: number;
  tokensEntrada: number;
  tokensSalida: number;
};

export type ResultadoAgente =
  | { tipo: "respuesta"; texto: string; gasto: GastoAgente }
  | { tipo: "plan"; texto: string; acciones: AccionPlan[]; gasto: GastoAgente };

// Cuántas veces puede ir y volver el modelo (buscar productos, pensar,
// proponer). Con 4 vueltas alcanza de sobra y acota el gasto.
const MAX_VUELTAS = 4;

// Cuánto puede durar TODO el razonamiento.
//
// Esto no es una preferencia: la función que atiende Telegram se muere
// sola a los 60 segundos y, cuando eso pasa, la dueña no recibe nada. Ni
// la respuesta ni un aviso: silencio, que es lo peor que puede hacer un
// asistente. Así que se corta antes, a tiempo para poder contestar.
const PRESUPUESTO_MS = 45_000;

// Por debajo de esto no vale la pena empezar otra vuelta: no daría tiempo
// de terminarla y solo gastaría cuota.
const MINIMO_POR_VUELTA_MS = 9_000;

export async function ejecutarAgente(
  entrada: Parte[],
  opciones: { presupuestoMs?: number } = {}
): Promise<ResultadoAgente> {
  const fin = Date.now() + (opciones.presupuestoMs ?? PRESUPUESTO_MS);
  let agotado = false;
  const instruccion = await construirInstruccion();
  const herramientas = declaracionesParaModelo();
  const mensajes: Mensaje[] = [{ role: "user", parts: entrada }];
  const acciones: AccionPlan[] = [];
  const gasto: GastoAgente = { llamadas: 0, tokensEntrada: 0, tokensSalida: 0 };

  for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
    const restante = fin - Date.now();
    if (restante < MINIMO_POR_VUELTA_MS) {
      agotado = true;
      break;
    }

    let respuesta;
    try {
      respuesta = await preguntarAlModelo({
        instruccion,
        mensajes,
        herramientas,
        limiteMs: restante,
      });
    } catch (error) {
      // Que se acabe el tiempo no es un fallo del que haya que huir: si ya
      // hay algo que proponer, se propone; y si no, se dice claramente.
      if (error instanceof ErrorAgente && error.tiempoAgotado) {
        agotado = true;
        break;
      }
      throw error;
    }

    gasto.llamadas += 1;
    gasto.tokensEntrada += respuesta.consumo.entrada;
    gasto.tokensSalida += respuesta.consumo.salida;

    // Sin llamadas a herramientas: el modelo ya terminó de pensar.
    if (respuesta.llamadas.length === 0) {
      const texto = respuesta.texto || "Listo.";
      return acciones.length > 0
        ? { tipo: "plan", texto, acciones, gasto }
        : { tipo: "respuesta", texto, gasto };
    }

    // El turno del modelo se reenvía TAL CUAL vino. Reconstruirlo a mano
    // perdía la firma de razonamiento que Gemini 3 exige de vuelta, y la
    // API rechazaba la conversación entera.
    mensajes.push({ role: "model", parts: respuesta.partesCrudas });

    // Y ahora resolvemos cada llamada.
    const respuestas: Parte[] = [];
    for (const llamada of respuesta.llamadas) {
      const herramienta = buscarHerramienta(llamada.nombre);

      if (!herramienta) {
        respuestas.push({
          functionResponse: {
            name: llamada.nombre,
            response: {
              ok: false,
              mensaje: "Esa acción no existe. No puedo hacer eso.",
            },
          },
        });
        continue;
      }

      if (herramienta.leer) {
        // Lectura: se ejecuta al toque, no cambia nada.
        const resultado = await herramienta.ejecutar(llamada.args);
        respuestas.push({
          functionResponse: {
            name: llamada.nombre,
            response: {
              ok: resultado.ok,
              mensaje: resultado.mensaje,
              datos: resultado.datos ?? null,
            },
          },
        });
        continue;
      }

      // Escritura: NO se ejecuta. Se guarda en el plan.
      let resumen: string;
      try {
        resumen = await herramienta.resumen(llamada.args);
      } catch {
        resumen = herramienta.nombre;
      }
      acciones.push({
        herramienta: llamada.nombre,
        args: llamada.args,
        resumen,
      });
      respuestas.push({
        functionResponse: {
          name: llamada.nombre,
          response: {
            ok: true,
            mensaje:
              "Anotado en el plan. Se ejecutará solo cuando la dueña confirme. No lo repitas.",
          },
        },
      });
    }

    mensajes.push({ role: "user", parts: respuestas });
  }

  // Se acabaron las vueltas (o el tiempo). Si alcanzó a armar un plan, lo
  // mostramos igual: es mejor eso que no decir nada.
  if (acciones.length > 0) {
    return {
      tipo: "plan",
      texto: agotado
        ? "Me demoré más de lo normal, así que revisa bien la lista antes de confirmar."
        : "Esto es lo que entendí:",
      acciones,
      gasto,
    };
  }
  if (agotado) {
    return {
      tipo: "respuesta",
      texto:
        "Se me hizo largo pensarlo y corté para no dejarte esperando sin respuesta. " +
        "Vuelve a mandármelo, o pídemelo en dos partes más simples.",
      gasto,
    };
  }
  return {
    tipo: "respuesta",
    texto:
      "No logré entender bien el pedido. ¿Me lo dices de otra forma, más concreto?",
    gasto,
  };
}

// ---- Aplicar el plan (después del botón Confirmar) -------------------

export type ResultadoAplicar = {
  hechos: string[];
  fallos: string[];
  // Una entrada por acción intentada, para poder anotarla en el historial
  // con su herramienta y sus argumentos (de ahí salen tipo y categoría).
  detalle: Array<{
    herramienta: string;
    args: ToolArgs;
    resumen: string;
    mensaje: string;
    ok: boolean;
  }>;
};

export async function aplicarPlan(
  acciones: AccionPlan[]
): Promise<ResultadoAplicar> {
  const hechos: string[] = [];
  const fallos: string[] = [];
  const detalle: ResultadoAplicar["detalle"] = [];

  const anotar = (accion: AccionPlan, mensaje: string, ok: boolean) => {
    detalle.push({
      herramienta: accion.herramienta,
      args: accion.args,
      resumen: accion.resumen,
      mensaje,
      ok,
    });
  };

  for (const accion of acciones) {
    const herramienta = buscarHerramienta(accion.herramienta);
    if (!herramienta || herramienta.leer) {
      const mensaje = `No pude ejecutar "${accion.resumen}".`;
      fallos.push(mensaje);
      anotar(accion, mensaje, false);
      continue;
    }
    try {
      const resultado = await herramienta.ejecutar(accion.args);
      if (resultado.ok) hechos.push(resultado.mensaje);
      else fallos.push(resultado.mensaje);
      anotar(accion, resultado.mensaje, resultado.ok);
    } catch (error) {
      const razon =
        error instanceof ErrorAgente || error instanceof Error
          ? error.message
          : "error inesperado";
      const mensaje = `"${accion.resumen}" falló: ${razon}`;
      fallos.push(mensaje);
      anotar(accion, mensaje, false);
    }
  }

  return { hechos, fallos, detalle };
}
