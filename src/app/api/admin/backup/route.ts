import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { isLoggedIn } from "@/lib/auth";
import { getDb } from "@/lib/db";

// Descarga una COPIA DE SEGURIDAD de toda la tienda (base de datos SQLite:
// pedidos, productos, stock, precios, banners y descuentos). Solo accesible
// con sesión de administrador. Usa la API backup() de SQLite para obtener una
// copia CONSISTENTE aunque en ese momento haya escrituras en curso.
//
// Uso: entra al panel y visita /api/admin/backup (o pon un enlace).
export async function GET() {
  if (!(await isLoggedIn())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const tmp = path.join(os.tmpdir(), `kona-backup-${process.pid}-${Date.now()}.db`);
  try {
    await getDb().backup(tmp);
    const data = await fs.readFile(tmp);
    const stamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="kona-backup-${stamp}.db"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[backup] error generando la copia:", e);
    return NextResponse.json(
      { error: "No se pudo generar la copia" },
      { status: 500 }
    );
  } finally {
    await fs.unlink(tmp).catch(() => {});
  }
}
