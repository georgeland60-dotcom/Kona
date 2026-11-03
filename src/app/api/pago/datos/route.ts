// Los datos de pago de la tienda, para enseñárselos a quien va a pagar
// por Yape, Plin o transferencia. Son públicos: es exactamente lo que
// la tienda pone en su perfil para que le paguen.
//
// Se piden recién cuando la clienta elige esa forma de pago, no al
// cargar la tienda: no tiene sentido traerlos para quien paga con
// tarjeta.
import { getDatosDePago } from "@/lib/pagos-data";

export async function GET() {
  return Response.json(await getDatosDePago(), {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
