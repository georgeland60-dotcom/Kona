"use client";

// =============================================================
//  EL MAPITA DE LA ENTREGA
//
//  Enseña dónde cayó la dirección y deja CORREGIRLO: la clienta
//  arrastra el pin (o toca el mapa) hasta su puerta. Esto no es un
//  adorno — en Lima medio padrón de calles está mapeado sin números, y
//  el buscador marca la cuadra, no el portal. Que ella mueva el pin
//  convierte "por ahí" en un punto exacto para quien reparte.
//
//  Dos cosas a propósito:
//   - Leaflet se carga SOLO cuando hay algo que enseñar (import
//     dinámico dentro del efecto). Son ~150 KB que no tienen por qué
//     pesar en quien solo mira vestidos.
//   - El pin NO cambia el precio. El envío sale del distrito que ella
//     eligió en el formulario; mover el pin tres cuadras no puede
//     cambiarle lo que paga sin avisar.
// =============================================================

import { useEffect, useRef, useState } from "react";
import type { Map as MapaLeaflet, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";

export type Punto = { lat: number; lon: number };

type Props = {
  // El punto que encontró el buscador. Al cambiar (otra dirección), el
  // mapa se vuelve a centrar y el pin se olvida de dónde lo dejaron.
  lat: number;
  lon: number;
  direccion: string;
  precision?: "exacta" | "calle" | "zona";
  // Se avisa con el punto nuevo, o con null al volver al encontrado.
  onMover: (punto: Punto | null) => void;
};

// Cuánto acercar según lo fino que se pudo ubicar: enseñar el portal con
// el zoom de un distrito entero no ayuda, y al contrario tampoco.
const ZOOM: Record<string, number> = { exacta: 17, calle: 16, zona: 14 };

// El pin, dibujado en HTML: así no depende de las imágenes de Leaflet,
// que con el empaquetado de Next se pierden y dejan el mapa sin marca.
const PIN_HTML =
  `<span style="display:block;width:24px;height:24px;cursor:grab;` +
  `background:#a90061;border:2px solid #fff;` +
  `border-radius:50% 50% 50% 0;transform:rotate(-45deg);` +
  `box-shadow:0 2px 6px rgba(0,0,0,.4)"></span>`;

export default function MapaEntrega({
  lat,
  lon,
  direccion,
  precision,
  onMover,
}: Props) {
  const caja = useRef<HTMLDivElement | null>(null);
  const mapa = useRef<MapaLeaflet | null>(null);
  const pin = useRef<Marker | null>(null);

  // El mapa se crea una sola vez y se queda con la función de aquel
  // momento; por la referencia siempre avisa a la de ahora.
  const avisar = useRef(onMover);
  avisar.current = onMover;

  const [movido, setMovido] = useState(false);
  const [grande, setGrande] = useState(false);

  // --- Nacer y morir ------------------------------------------------
  useEffect(() => {
    let vivo = true;

    (async () => {
      const L = await import("leaflet");
      if (!vivo || !caja.current || mapa.current) return;

      const m = L.map(caja.current, {
        center: [lat, lon],
        zoom: ZOOM[precision ?? "exacta"] ?? 16,
        // En el carrito el dedo tiene que poder bajar por el panel sin
        // quedarse atrapado en el mapa; para acercar están los botones.
        scrollWheelZoom: false,
        attributionControl: true,
      });

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(m);

      const marca = L.marker([lat, lon], {
        draggable: true,
        autoPan: true,
        keyboard: true,
        title: "Arrástrame hasta tu puerta",
        icon: L.divIcon({
          html: PIN_HTML,
          className: "",
          // La punta del pin (abajo) es la que marca el sitio, no su
          // centro: si no, el punto queda media cuadra más arriba.
          iconSize: [24, 24],
          iconAnchor: [12, 24],
        }),
      }).addTo(m);

      const anotar = (p: { lat: number; lng: number }) => {
        setMovido(true);
        // Seis decimales son ~10 cm: más es ruido.
        avisar.current({
          lat: Number(p.lat.toFixed(6)),
          lon: Number(p.lng.toFixed(6)),
        });
      };

      marca.on("dragend", () => anotar(marca.getLatLng()));
      // Tocar el mapa también mueve el pin: en el móvil arrastrar algo
      // de 26 píxeles con el pulgar no siempre sale.
      m.on("click", (e) => {
        marca.setLatLng(e.latlng);
        anotar(e.latlng);
      });

      mapa.current = m;
      pin.current = marca;
    })();

    return () => {
      vivo = false;
      mapa.current?.remove();
      mapa.current = null;
      pin.current = null;
    };
    // A propósito solo al montar: el resto de los cambios los mueve el
    // efecto de abajo, sin rehacer el mapa entero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Otra dirección: recentrar y olvidar el pin movido -------------
  useEffect(() => {
    if (!mapa.current || !pin.current) return;
    pin.current.setLatLng([lat, lon]);
    mapa.current.setView([lat, lon], ZOOM[precision ?? "exacta"] ?? 16);
    setMovido(false);
    onMover(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon, precision]);

  // --- Al agrandarlo hay que avisarle del tamaño nuevo ---------------
  // Sin esto Leaflet sigue creyendo que mide 176 px y deja media caja
  // en gris, sin cargar las piezas que faltan.
  useEffect(() => {
    if (!mapa.current) return;
    const m = mapa.current;
    const t = setTimeout(() => {
      m.invalidateSize();
      if (grande) caja.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 220);
    return () => clearTimeout(t);
  }, [grande]);

  const volver = () => {
    pin.current?.setLatLng([lat, lon]);
    mapa.current?.setView([lat, lon], ZOOM[precision ?? "exacta"] ?? 16);
    setMovido(false);
    onMover(null);
  };

  return (
    // Agrandado, el mapa se pone ENCIMA de todo en vez de empujar el
    // panel hacia abajo. La primera versión lo estiraba ahí mismo y
    // dejaba los botones de pagar fuera de la pantalla, sin forma de
    // llegar a ellos. El árbol es el mismo en los dos casos (solo
    // cambian las clases) para que Leaflet no pierda su mapa.
    <div
      className={
        grande
          ? "fixed inset-0 z-[60] bg-background flex flex-col"
          : "border border-line rounded-xl overflow-hidden"
      }
    >
      {/* Dos cajas, y no una, por una razón concreta: Leaflet escribe
          sus propias clases en el elemento del mapa, y si React le
          reescribe el className al re-pintar (al agrandarlo, por
          ejemplo) se las lleva por delante y el mapa se desarma. Así la
          de dentro nunca cambia; la de fuera es la que crece. */}
      <div className={grande ? "flex-1 min-h-0" : "h-44"}>
        <div
          ref={caja}
          role="application"
          aria-label="Mapa de la dirección de entrega"
          className="w-full h-full z-0"
        />
      </div>

      <div className="px-3 py-2 space-y-1 flex-shrink-0">
        <p className="text-[11px] text-muted">
          {movido
            ? "Punto marcado por ti. "
            : precision === "zona"
              ? "Zona aproximada: "
              : precision === "calle"
                ? "Cuadra de "
                : ""}
          {!movido && direccion}
        </p>
        <p className="text-[11px] text-muted">
          ¿No es exacto? Arrastra el pin o toca el mapa para marcar tu puerta.
        </p>
        <div className="flex items-center gap-3 text-[11px]">
          {!grande && (
            <button type="button" onClick={() => setGrande(true)} className="underline">
              Agrandar el mapa
            </button>
          )}
          {movido && (
            <button type="button" onClick={volver} className="underline text-muted">
              Volver al punto encontrado
            </button>
          )}
        </div>
        {grande && (
          <button
            type="button"
            onClick={() => setGrande(false)}
            className="w-full bg-accent text-white py-2.5 rounded-full text-sm font-medium mt-1"
          >
            Listo, este es el punto
          </button>
        )}
      </div>
    </div>
  );
}
