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
//
//  Sobre el TIEMPO. Un pedido complicado ("cuando lleven la cartera
//  verde, 10% de toda la compra con tope de 85") necesita varias idas y
//  vueltas con la IA, y el servidor mata la función a los pocos minutos.
//  Por eso el agente guarda su estado y puede seguir pensando en otra
//  tanda: aquí se trabaja con un presupuesto por tanda, y cuando se
//  acaba se devuelve "pendiente" en vez de morir a medio camino.
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

// Todo lo que hace falta para retomar el razonamiento donde se quedó.
// Viaja a la base de datos entre una tanda y la siguiente.
export type EstadoAgente = {
  mensajes: Mensaje[];
  acciones: AccionPlan[];
  gasto: GastoAgente;
  vuelta: number;
  inicio: number; // cuándo empezó todo (para el tope general)
  // Veces seguidas que una respuesta de la IA no llegó a tiempo. Si una
  // sola respuesta no cabe nunca en una tanda, seguir reintentando sería
  // dar vueltas para siempre gastando cuota.
  cortes?: number;
};

export type ResultadoAgente =
  | { tipo: "respuesta"; texto: string; gasto: GastoAgente }
  | { tipo: "plan"; texto: string; acciones: AccionPlan[]; gasto: GastoAgente }
  // Se acabó el tiempo de ESTA tanda, pero el pedido sigue en pie: hay
  // que retomarlo en otra. No es un error.
  | { tipo: "pendiente"; estado: EstadoAgente };

// Cuántas veces puede ir y volver el modelo (buscar productos, pensar,
// proponer). Un pedido normal usa 2 o 3; el tope es para que un enredo
// no se quede dando vueltas para siempre.
const MAX_VUELTAS = 16;

// Tope general de paciencia: media hora. No se espera llegar nunca, pero
// es preferible un límite claro a un agente pensando indefinidamente.
export const TOPE_TOTAL_MS = 30 * 60 * 1000;

// Por debajo de esto no vale la pena empezar otra vuelta en esta tanda:
// no daría tiempo de terminarla y solo gastaría cuota.
const MINIMO_POR_VUELTA_MS = 12_000;

// Cuántos cortes seguidos se toleran antes de rendirse y decirlo.
const MAX_CORTES = 3;

export function estadoInicial(entrada: Parte[]): EstadoAgente {
  return {
    mensajes: [{ role: "user", parts: entrada }],
    acciones: [],
    gasto: { llamadas: 0, tokensEntrada: 0, tokensSalida: 0 },
    vuelta: 0,
    inicio: Date.now(),
    cortes: 0,
  };
}

// Avanza el razonamiento todo lo que quepa en el presupuesto de tiempo.
// OJO: modifica "estado" sobre la marcha, a propósito: así, aunque se
// corte a media tanda, lo ya pensado no se pierde.
export async function ejecutarAgente(
  estado: EstadoAgente,
  opciones: { presupuestoMs: number }
): Promise<ResultadoAgente> {
  const finDeTanda = Date.now() + opciones.presupuestoMs;
  const llamadasAlEmpezar = estado.gasto.llamadas;
  const instruccion = await construirInstruccion();
  const herramientas = declaracionesParaModelo();

  while (estado.vuelta < MAX_VUELTAS) {
    // ¿Se pasó del tope general? Entonces se corta de verdad.
    if (Date.now() - estado.inicio > TOPE_TOTAL_MS) {
      return cerrarPorTiempo(estado);
    }

    // ¿Se acabó el tiempo de esta tanda? Se sigue en la próxima.
    const restante = finDeTanda - Date.now();
    if (restante < MINIMO_POR_VUELTA_MS) {
      // Si en toda la tanda no se avanzó nada, encadenar otra igual sería
      // dar vueltas sin fin (pasa si el presupuesto quedó mal puesto).
      // Se cuenta como corte y a los tres se corta de verdad.
      if (estado.gasto.llamadas === llamadasAlEmpezar) {
        estado.cortes = (estado.cortes ?? 0) + 1;
        if (estado.cortes >= MAX_CORTES) return rendirse(estado);
      }
      return { tipo: "pendiente", estado };
    }

    estado.vuelta += 1;
    // Se cuenta el INTENTO, no el acierto: una petición que Google frena
    // o que no llega a tiempo también gastó su lugar en el límite. Contar
    // solo las que salen bien deja fuera justo las que causan el problema.
    estado.gasto.llamadas += 1;

    let respuesta;
    try {
      respuesta = await preguntarAlModelo({
        instruccion,
        mensajes: estado.mensajes,
        herramientas,
        limiteMs: restante,
      });
    } catch (error) {
      // Que se acabe el tiempo no es un fallo: se retoma en otra tanda.
      if (error instanceof ErrorAgente && error.tiempoAgotado) {
        estado.cortes = (estado.cortes ?? 0) + 1;
        // Siempre se corta en el mismo punto: seguir no lo va a arreglar.
        if (estado.cortes >= MAX_CORTES) return rendirse(estado);
        return { tipo: "pendiente", estado };
      }
      throw error;
    }

    estado.cortes = 0;
    estado.gasto.tokensEntrada += respuesta.consumo.entrada;
    estado.gasto.tokensSalida += respuesta.consumo.salida;

    // Sin llamadas a herramientas: el modelo ya terminó de pensar.
    if (respuesta.llamadas.length === 0) {
      const texto = respuesta.texto || "Listo.";
      return estado.acciones.length > 0
        ? { tipo: "plan", texto, acciones: estado.acciones, gasto: estado.gasto }
        : { tipo: "respuesta", texto, gasto: estado.gasto };
    }

    // El turno del modelo se reenvía TAL CUAL vino. Reconstruirlo a mano
    // perdía la firma de razonamiento que Gemini 3 exige de vuelta, y la
    // API rechazaba la conversación entera.
    estado.mensajes.push({ role: "model", parts: respuesta.partesCrudas });

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
      estado.acciones.push({
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

    estado.mensajes.push({ role: "user", parts: respuestas });
  }

  // Se acabaron las vueltas. Si alcanzó a armar un plan, lo mostramos.
  if (estado.acciones.length > 0) {
    return {
      tipo: "plan",
      texto: "Esto es lo que entendí:",
      acciones: estado.acciones,
      gasto: estado.gasto,
    };
  }
  return {
    tipo: "respuesta",
    texto:
      "No logré entender bien el pedido. ¿Me lo dices de otra forma, más concreto?",
    gasto: estado.gasto,
  };
}

// No se logra avanzar: la IA no contesta a tiempo, una y otra vez.
function rendirse(estado: EstadoAgente): ResultadoAgente {
  if (estado.acciones.length > 0) {
    return {
      tipo: "plan",
      texto:
        "La IA se está demorando muchísimo en cada respuesta, así que te muestro lo que alcancé a armar. Revísalo bien.",
      acciones: estado.acciones,
      gasto: estado.gasto,
    };
  }
  return {
    tipo: "respuesta",
    texto:
      "La IA está tardando demasiado en responder y no logro avanzar. Vuelve a intentarlo en un rato, o pídemelo más simple.",
    gasto: estado.gasto,
  };
}

// Se acabó la paciencia (media hora). Igual se contesta: con lo que
// alcanzó a armar, o diciéndolo claro. Nunca en silencio.
function cerrarPorTiempo(estado: EstadoAgente): ResultadoAgente {
  if (estado.acciones.length > 0) {
    return {
      tipo: "plan",
      texto:
        "Me tomó mucho más de lo normal, así que revisa bien la lista antes de confirmar.",
      acciones: estado.acciones,
      gasto: estado.gasto,
    };
  }
  return {
    tipo: "respuesta",
    texto:
      "Llevo media hora dándole vueltas y no logro cerrarlo. Mejor pídemelo en dos partes más simples.",
    gasto: estado.gasto,
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
