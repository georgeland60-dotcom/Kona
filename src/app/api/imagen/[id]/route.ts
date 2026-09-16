// =============================================================
//  SERVIR UNA FOTO DE PRODUCTO
//
//  Las fotos que manda la dueña por Telegram se guardan en la base y se
//  muestran desde aquí. La foto de un producto no cambia nunca (si
//  cambia, es otra foto con otro id), así que se sirve con caché eterna
//  y el navegador y el CDN no vuelven a pedirla.
// =============================================================

import { leerImagen } from "@/lib/imagenes";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const imagen = await leerImagen(id);

  if (!imagen) {
    return new Response("No existe esa foto", { status: 404 });
  }

  return new Response(new Uint8Array(imagen.bytes), {
    headers: {
      "Content-Type": imagen.mime,
      "Content-Length": String(imagen.bytes.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
