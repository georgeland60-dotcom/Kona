// =============================================================
//  MANDAR UN CORREO (Resend)
//
//  Un solo sitio que habla con el servicio de correo. Sin la clave
//  (RESEND_API_KEY, la pone la persona en Vercel) no se manda nada y la
//  tienda sigue funcionando igual: el correo es un extra, nunca puede
//  romper una venta.
//
//  Remitente: CORREO_REMITENTE, o "Kona Moda <pedidos@konamoda.pe>".
//  Para que salga desde @konamoda.pe el dominio tiene que estar
//  verificado en Resend (registros DNS en Vercel).
// =============================================================

const API = process.env.RESEND_API_URL || "https://api.resend.com";

export function correoConfigurado(): boolean {
  return !!process.env.RESEND_API_KEY?.trim();
}

// Las direcciones que reciben el aviso de cada venta (CORREO_TIENDA,
// separadas por coma). Van en Vercel y no en el código: son personales.
export function correosDeLaTienda(): string[] {
  return (process.env.CORREO_TIENDA ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(esCorreo);
}

export function esCorreo(texto: string | undefined | null): texto is string {
  return !!texto && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(texto.trim()) && texto.length <= 120;
}

export async function enviarCorreo(datos: {
  para: string[];
  asunto: string;
  html: string;
  texto: string;
  responderA?: string;
}): Promise<boolean> {
  const clave = process.env.RESEND_API_KEY?.trim();
  const para = datos.para.filter(esCorreo);
  if (!clave || para.length === 0) return false;

  try {
    const res = await fetch(`${API}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.CORREO_REMITENTE?.trim() || "Kona Moda <pedidos@konamoda.pe>",
        to: para,
        subject: datos.asunto,
        html: datos.html,
        text: datos.texto,
        ...(datos.responderA ? { reply_to: datos.responderA } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.log(`[correo] Resend respondió ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return false;
    }
    return true;
  } catch (e) {
    console.log("[correo] no se pudo mandar:", e instanceof Error ? e.message : e);
    return false;
  }
}
