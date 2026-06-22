import { NextResponse } from "next/server";
import { recordProductView, recordVisit } from "@/lib/metrics-data";

// Recibe un "ping" del navegador para contar una vista de producto o una
// visita a la tienda. No requiere sesión (es tráfico público anónimo).
export async function POST(req: Request) {
  try {
    const { type, id } = (await req.json()) as { type?: string; id?: string };
    if (type === "product" && id) {
      await recordProductView(id);
    } else if (type === "visit") {
      await recordVisit();
    }
  } catch {
    // ignoramos pings malformados
  }
  return NextResponse.json({ ok: true });
}
