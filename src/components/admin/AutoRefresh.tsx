"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Refresca los datos del panel cada cierto tiempo SIN recargar toda la
// página (usa router.refresh(), que vuelve a pedir los datos del servidor).
// Incluye un interruptor por si se quiere pausar.
export default function AutoRefresh({ seconds = 25 }: { seconds?: number }) {
  const router = useRouter();
  const [on, setOn] = useState(true);

  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [on, seconds, router]);

  return (
    <button
      type="button"
      onClick={() => setOn((v) => !v)}
      className="flex items-center gap-2 text-xs text-muted hover:text-foreground transition"
      title={on ? "Actualizando en vivo. Clic para pausar." : "Pausado. Clic para reanudar."}
    >
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          on ? "bg-green-500 animate-pulse" : "bg-line"
        }`}
      />
      {on ? "En vivo" : "Pausado"}
    </button>
  );
}
