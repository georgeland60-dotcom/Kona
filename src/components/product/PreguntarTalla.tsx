"use client";

// =============================================================
//  "NO SÉ MI TALLA" — la entrada al asistente desde la ficha
//
//  Es el momento exacto en que la duda aparece: ya eligió la prenda y
//  está mirando las tallas. Poner aquí la puerta al asistente vale más
//  que cualquier burbuja flotante, porque llega cuando hace falta.
// =============================================================

export default function PreguntarTalla() {
  return (
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(new CustomEvent("kona-asistente:abrir"))
      }
      className="mt-3 w-full flex items-center justify-center gap-2 border border-accent text-accent rounded-full py-2.5 text-sm font-medium hover:bg-accent hover:text-white transition"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 11.5a8.5 8.5 0 0 1-12.2 7.6L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5z" />
      </svg>
      ¿Te ayudamos a elegir tu talla?
    </button>
  );
}
