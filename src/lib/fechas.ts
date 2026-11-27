// =============================================================
//  FECHAS: EL DÍA DE LA TIENDA Y EL DÍA DE GOOGLE
//
//  Aquí conviven dos calendarios distintos y confundirlos hace que el
//  panel diga cosas que no cuadran:
//
//   - El día de la TIENDA es el de Lima. "Lo de hoy" tiene que cambiar a
//     medianoche en Perú, no a las 7 de la tarde, que es cuando cambia
//     el día en UTC (y era lo que pasaba).
//
//   - El día del LÍMITE DE CONSULTAS es el de Google, que cuenta en hora
//     del Pacífico. Su tope se reinicia a medianoche allá, o sea a las
//     2 o 3 de la madrugada en Lima según la época del año. Por eso un
//     modelo puede seguir topado aunque en Perú ya sea "mañana".
// =============================================================

const ZONA_TIENDA = "America/Lima";
const ZONA_GOOGLE = "America/Los_Angeles";

// AAAA-MM-DD en la zona que se pida.
function diaEn(zona: string, momento: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(momento);
}

// Perú no cambia de hora (desde 1994): su desfase es fijo.
const DESFASE_LIMA = "-05:00";

// Una fecha que escribe la dueña ("2026-11-29") es un día de LIMA.
//
// Sin zona, JavaScript la lee en la hora del servidor, y en Vercel eso
// es UTC: "hasta el domingo 29" terminaba el domingo a las 7 de la
// tarde de Lima, y "desde el viernes" empezaba el jueves a las 7. Una
// promoción que se apaga cinco horas antes, en plena noche de compras.
//
// Acepta también fecha con hora sin zona ("2026-11-29T20:00"), que se
// entiende igual: hora de Lima. Si ya trae zona, se respeta.
export function fechaDeLima(
  valor: string | undefined,
  finDelDia = false
): string | undefined {
  const v = (valor ?? "").trim();
  if (!v) return undefined;
  let texto = v;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    texto = `${v}T${finDelDia ? "23:59:59" : "00:00:00"}${DESFASE_LIMA}`;
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(v)) {
    texto = `${v}${DESFASE_LIMA}`;
  }
  const d = new Date(texto);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

// El "hoy" de la tienda: el que ve la dueña.
export function hoyEnLima(momento: Date = new Date()): string {
  return diaEn(ZONA_TIENDA, momento);
}

// El "hoy" de Google, que es con el que cuenta las consultas.
export function diaDeGoogle(momento: Date = new Date()): string {
  return diaEn(ZONA_GOOGLE, momento);
}

// ¿Ese corte sigue vigente? Solo si ocurrió dentro del día de Google que
// está corriendo ahora. Preguntarlo así evita tener que saber a qué hora
// exacta reinicia: se compara el día y ya.
export function siguenEnElMismoDiaDeGoogle(
  cuandoISO: string,
  ahora: Date = new Date()
): boolean {
  const cuando = new Date(cuandoISO);
  if (Number.isNaN(cuando.getTime())) return false;
  return diaDeGoogle(cuando) === diaDeGoogle(ahora);
}

// Cuándo vuelve a haber margen: el próximo cambio de día en el Pacífico.
// Se busca hora a hora en vez de calcularlo con husos a mano, para que
// los cambios de horario de verano no lo descuadren.
export function proximoReinicioDeGoogle(ahora: Date = new Date()): Date {
  const hoyAlla = diaDeGoogle(ahora);
  const paso = 60 * 60 * 1000;
  let t = ahora.getTime();

  // Primero se salta a la hora en que ya cambió el día...
  for (let i = 0; i < 48; i++) {
    t += paso;
    if (diaDeGoogle(new Date(t)) !== hoyAlla) break;
  }
  // ...y luego se afina hacia atrás minuto a minuto hasta el borde.
  let borde = t;
  for (let i = 0; i < 60; i++) {
    const anterior = borde - 60 * 1000;
    if (diaDeGoogle(new Date(anterior)) === hoyAlla) break;
    borde = anterior;
  }
  return new Date(borde);
}

// La hora del reinicio, escrita para Lima ("2:00 a. m.").
export function reinicioEnHoraDeLima(ahora: Date = new Date()): string {
  return proximoReinicioDeGoogle(ahora).toLocaleTimeString("es-PE", {
    timeZone: ZONA_TIENDA,
    hour: "2-digit",
    minute: "2-digit",
  });
}
