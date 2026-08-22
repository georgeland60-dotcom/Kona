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

export type ResultadoAgente =
  | { tipo: "respuesta"; texto: string }
  | { tipo: "plan"; texto: string; acciones: AccionPlan[] };

// Cuántas veces puede ir y volver el modelo (buscar productos, pensar,
// proponer). Con 4 vueltas alcanza de sobra y acota el gasto.
const MAX_VUELTAS = 4;

export async function ejecutarAgente(
  entrada: Parte[]
): Promise<ResultadoAgente> {
  const instruccion = await construirInstruccion();
  const herramientas = declaracionesParaModelo();
  const mensajes: Mensaje[] = [{ role: "user", parts: entrada }];
  const acciones: AccionPlan[] = [];

  for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
    const respuesta = await preguntarAlModelo({
      instruccion,
      mensajes,
      herramientas,
    });

    // Sin llamadas a herramientas: el modelo ya terminó de pensar.
    if (respuesta.llamadas.length === 0) {
      const texto = respuesta.texto || "Listo.";
      return acciones.length > 0
        ? { tipo: "plan", texto, acciones }
        : { tipo: "respuesta", texto };
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

  // Se acabaron las vueltas. Si alcanzó a armar un plan, lo mostramos.
  if (acciones.length > 0) {
    return {
      tipo: "plan",
      texto: "Esto es lo que entendí:",
      acciones,
    };
  }
  return {
    tipo: "respuesta",
    texto:
      "No logré entender bien el pedido. ¿Me lo dices de otra forma, más concreto?",
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
