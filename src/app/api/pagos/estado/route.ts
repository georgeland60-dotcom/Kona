// =============================================================
//  ¿CON QUÉ CREDENCIALES COBRA LA TIENDA?
//
//  Para diagnosticar un "No pudimos procesar tu pago" de Mercado Pago
//  sin que nadie tenga que ver la clave: dice si el Access Token es de
//  producción o de prueba, y a qué cuenta cobra. NUNCA devuelve la
//  clave ni un pedazo de ella.
//
//  Con credenciales de prueba, Mercado Pago rechaza cualquier tarjeta
//  real y esos intentos no aparecen en la Actividad de la cuenta.
//
//  El número de cuenta que devuelve ya es público: va al principio de
//  cada enlace de pago de Mercado Pago (preference-id=NÚMERO-...).
// =============================================================

const API = process.env.MERCADOPAGO_API_URL || "https://api.mercadopago.com";

export async function GET() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  const sinCache = { headers: { "Cache-Control": "no-store" } };

  if (!token) return Response.json({ credenciales: "faltan" }, sinCache);

  const tipo = token.startsWith("APP_USR-")
    ? "produccion"
    : token.startsWith("TEST-")
      ? "prueba"
      : "desconocido";

  try {
    const res = await fetch(`${API}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return Response.json(
        { credenciales: tipo, valida: false, respuesta: res.status },
        sinCache
      );
    }
    const yo = (await res.json()) as {
      id?: number;
      site_id?: string;
      tags?: string[];
    };
    return Response.json(
      {
        credenciales: tipo,
        valida: true,
        cuenta: yo.id,
        pais: yo.site_id,
        usuarioDePrueba: (yo.tags ?? []).includes("test_user"),
      },
      sinCache
    );
  } catch {
    return Response.json({ credenciales: tipo, valida: null }, sinCache);
  }
}
