// Escapa un valor para CSV: entrecomilla si trae comas, comillas o saltos
// de línea, que es justo lo que rompe estos archivos al abrirlos.
export function celda(valor: string | number): string {
  let s = String(valor ?? "");
  // Un texto que escribió una clienta (su nombre, su dirección) y que
  // empieza por = + - @ Excel lo ejecuta como fórmula al abrir el
  // archivo. Con un apóstrofo delante queda como texto. Los números
  // (-5, por ejemplo) se dejan como están.
  if (typeof valor === "string" && /^[=+\-@\t\r]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s)) {
    s = `'${s}`;
  }
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
