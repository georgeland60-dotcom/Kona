// =============================================================
//  GARABATOS DE MARCA
//  El manual pide una iconografia "juvenil, de trazo libre, solida o
//  delineada: corazones, estrellas, flores... que connoten optimismo,
//  positivismo, felicidad, feminidad".
//  Estos son esos trazos, dibujados a mano en SVG para que se puedan
//  pintar con cualquier color y no pesen nada.
// =============================================================

type Props = {
  className?: string;
  // "solido" rellena el trazo; "linea" lo deja delineado (ambos los
  // permite el manual).
  variante?: "solido" | "linea";
};

const base = "inline-block shrink-0";

export function Corazon({ className = "", variante = "solido" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} aria-hidden="true">
      <path
        d="M12 21c-.3 0-.6-.1-.8-.3C7.5 17.4 3 13.9 3 9.2 3 6.3 5.2 4 8 4c1.6 0 3.1.8 4 2.1C12.9 4.8 14.4 4 16 4c2.8 0 5 2.3 5 5.2 0 4.7-4.5 8.2-8.2 11.5-.2.2-.5.3-.8.3z"
        fill={variante === "solido" ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={variante === "solido" ? 0 : 1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Estrella({ className = "", variante = "solido" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} aria-hidden="true">
      <path
        d="M12 2.5c.4 2.9 1.3 5 2.8 6.3 1.4 1.3 3.5 2.1 6.4 2.6-2.9.5-5 1.3-6.4 2.6-1.5 1.3-2.4 3.4-2.8 6.5-.4-3.1-1.3-5.2-2.8-6.5-1.4-1.3-3.5-2.1-6.4-2.6 2.9-.5 5-1.3 6.4-2.6C10.7 7.5 11.6 5.4 12 2.5z"
        fill={variante === "solido" ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={variante === "solido" ? 0 : 1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Flor({ className = "", variante = "linea" }: Props) {
  const relleno = variante === "solido" ? "currentColor" : "none";
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.4" fill={relleno} strokeLinecap="round">
        {/* cinco petalos de trazo suelto */}
        {[0, 72, 144, 216, 288].map((g) => (
          <ellipse key={g} cx="12" cy="7" rx="3" ry="4.6" transform={`rotate(${g} 12 12)`} />
        ))}
        <circle cx="12" cy="12" r="1.9" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}

// Una rayita suelta, de las que el manual muestra como puntos y comas
// sueltas. Sirve para separar bloques sin usar una linea recta dura.
export function Trazo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 12" className={`${base} ${className}`} aria-hidden="true">
      <path
        d="M2 8c14-7 28 4 42-1s26-6 38 1 26 2 38-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
