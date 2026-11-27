import { Corazon } from "@/components/brand/Garabatos";

// =============================================================
//  CINTA DE OFERTA
//  La cinta del banner de campaña, puesta sobre cada foto de producto:
//  una sola, inclinada, en el azul del arte del banner (#31385f, sacado
//  de la imagen; un poco más apagado que el azul de marca) con letras
//  blancas. La dueña pidió una sola y en ese color (27 nov 2026).
//  Blanco sobre ese azul: contraste de sobra para letra chica.
//
//  Lo que dice sale de la regla que de verdad se aplica a ESA prenda
//  (50% en casi todo, 35% en blazers y ropa de baño entera), nunca de
//  un número escrito a mano.
//
//  Quieta a propósito: en una grilla de 80 prendas, 80 cintas moviéndose
//  marean y cansan. El banner ya se encarga de llamar la atención.
// =============================================================

function Separador({ className }: { className: string }) {
  return <Corazon variante="linea" className={`w-3 h-3 md:w-3.5 md:h-3.5 ${className}`} />;
}

export default function CintaOferta({
  pct,
  lema,
}: {
  pct: number;
  lema?: string;
}) {
  const oferta = `${pct}% OFF`;
  // El % va al centro: es lo que se tiene que leer aunque la tarjeta
  // sea angosta (en celular, dos por fila) y los extremos queden cortados.
  const piezas = lema ? [lema, oferta, lema] : [oferta, oferta, oferta];

  // Al borde de abajo de la foto, como en el banner: ahí suele haber
  // piernas o piso. Más arriba tapaba la prenda (los shorts, la parte de
  // abajo del bikini), que es justo lo que se vende.
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3.25rem]">
      <p className="sr-only">
        {pct}% de descuento{lema ? `, ${lema}` : ""}
      </p>


      <div
        aria-hidden="true"
        className="absolute -left-[15%] -right-[15%] top-3 rotate-[1.5deg] md:rotate-[2.5deg] bg-[#31385f] text-white shadow-[0_3px_10px_rgba(0,0,0,0.25)] py-1.5 flex items-center justify-center gap-2 whitespace-nowrap overflow-hidden text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.18em]"
      >
        {piezas.map((t, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <Separador className="text-white" />}
            <span className={t === oferta ? "font-bold text-[1.15em] tracking-[0.12em]" : ""}>
              {t}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
