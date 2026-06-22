"use client";

import { useEffect, useRef } from "react";

// Envía un "ping" anónimo para contar la vista. Se dispara una sola vez
// al montar. No bloquea nada ni muestra nada en pantalla.
export default function TrackView({
  type,
  id,
}: {
  type: "product" | "visit";
  id?: string;
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id }),
      keepalive: true,
    }).catch(() => {});
  }, [type, id]);

  return null;
}
