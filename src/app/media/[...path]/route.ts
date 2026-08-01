import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { UPLOADS_DIR } from "@/lib/paths";

// Sirve las fotos subidas desde el panel, guardadas en el disco persistente
// (UPLOADS_DIR). Se accede como /media/<archivo>. Las fotos de la semilla
// (versionadas en git) siguen sirviéndose desde /public normalmente.
const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: parts } = await params;
  const rel = (parts || []).join("/");

  // Seguridad: la ruta resuelta debe quedar DENTRO de UPLOADS_DIR
  // (evita trucos tipo ../../ para leer otros archivos).
  const base = path.resolve(UPLOADS_DIR);
  const full = path.resolve(base, rel);
  if (full !== base && !full.startsWith(base + path.sep)) {
    return new NextResponse("Ruta inválida", { status: 400 });
  }

  try {
    const data = await fs.readFile(full);
    const type = TYPES[path.extname(full).toLowerCase()] || "application/octet-stream";
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("No encontrado", { status: 404 });
  }
}
