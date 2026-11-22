// =============================================================
//  LA CAMPANA DE DESCUENTO
//
//  Tres tamanos del mismo aviso, para los tres sitios donde va:
//   · Chip      -> el cuadro de categoria del inicio y el menu
//   · Cinta     -> arriba del todo al abrir una categoria
//
//  Sobre el color: el chip va en el FUCSIA de la marca (A90061) y no
//  en el magenta, que es mas llamativo pero con letra blanca da
//  3.75:1 y la letra del chip es pequena. El fucsia da 7.3:1. El
//  magenta se usa solo donde NO hay texto encima: el halo y el punto
//  del menu.
//
//  El movimiento es un adorno, nunca la informacion: si el telefono
//  pide "menos movimiento" se queda todo quieto y el aviso se sigue
//  leyendo igual (las animaciones se apagan en globals.css).
// =============================================================

export function IconoCampana({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// El aviso chico: va encima de la foto de la categoria y en el menu.
export function ChipDescuento({
  etiqueta,
  className = "",
}: {
  etiqueta: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-k-fucsia text-white pl-2 pr-3 py-1.5 shadow-lg shadow-k-fucsia/30 ring-2 ring-white/70 kona-campana-halo ${className}`}
    >
      <IconoCampana className="w-3.5 h-3.5 kona-campana-toca" />
      {/* Sin uppercase: el gancho ya viene escrito como toca ("15% OFF",
          "2x1") y forzar mayusculas lo dejaba en "2X1". */}
      <span className="text-[11px] font-bold tracking-[0.08em] leading-none">
        {etiqueta}
      </span>
    </span>
  );
}

// El punto del menu: ahi no cabe el texto, solo avisa de que hay algo.
export function PuntoDescuento({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex w-2 h-2 shrink-0 ${className}`}
    >
      <span className="absolute inset-0 rounded-full bg-k-magenta kona-campana-onda" />
      <span className="relative inline-flex w-2 h-2 rounded-full bg-k-magenta" />
    </span>
  );
}

// La cinta grande: lo primero que se ve al abrir una categoria con
// descuento. Aqui si hay sitio para decirlo entero.
export function CintaDescuento({
  etiqueta,
  categoria,
}: {
  etiqueta: string;
  categoria: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] bg-k-fucsia text-white px-6 py-6 md:px-10 md:py-7 mb-10 shadow-xl shadow-k-fucsia/25">
      {/* Dos manchas de color para que no sea un rectangulo plano. No
          llevan texto encima, por eso pueden ser magenta. */}
      <span
        aria-hidden="true"
        className="absolute -top-10 -right-6 w-44 h-44 rounded-full bg-k-magenta/40 blur-2xl"
      />
      <span
        aria-hidden="true"
        className="absolute -bottom-16 left-10 w-40 h-40 rounded-full bg-k-rosa/30 blur-2xl"
      />

      <div className="relative flex items-center gap-4 md:gap-6">
        <span className="shrink-0 grid place-items-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/15 ring-2 ring-white/40">
          <IconoCampana className="w-6 h-6 md:w-7 md:h-7 kona-campana-toca" />
        </span>
        <div className="min-w-0">
          <p className="uppercase tracking-[0.3em] text-[10px] md:text-[11px] font-semibold text-white/85">
            Descuento activo
          </p>
          <p className="font-bold text-2xl md:text-4xl leading-tight mt-0.5">
            {etiqueta}{" "}
            <span className="font-script font-normal text-3xl md:text-5xl">
              en {categoria}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
