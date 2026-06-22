// Convierte un numero en precio con formato de soles, ej: 129 -> "S/ 129.00"
export function formatPrice(value: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(value);
}
