// =============================================================
//  AUTENTICACIÓN DEL PANEL (un solo usuario: la dueña)
//  - La contraseña vive en .env.local (ADMIN_PASSWORD).
//  - Al entrar, guardamos una "cookie" firmada con HMAC para que
//    nadie pueda falsificarla. La cookie es httpOnly (el navegador
//    no la expone a JavaScript) y dura 7 días.
// =============================================================

import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "kona_admin";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 días en segundos

// Si en producción faltara ADMIN_SESSION_SECRET, NO se usa una clave
// conocida: el repositorio es público y cualquiera podría fabricarse la
// cookie del panel con ella. Se usa una al azar que nadie conoce (las
// sesiones durarán poco, pero nadie se cuela) y se avisa en los logs.
const AL_AZAR = crypto.randomBytes(32).toString("hex");

function secret(): string {
  const real = process.env.ADMIN_SESSION_SECRET?.trim();
  if (real) return real;
  if (process.env.NODE_ENV === "production") {
    console.error("[panel] falta ADMIN_SESSION_SECRET: se usa una clave al azar");
    return AL_AZAR;
  }
  return "kona-dev-secret-solo-en-la-laptop";
}

// Firma un texto con HMAC-SHA256.
function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

// Genera el contenido de la cookie: "<expira>.<firma>".
function makeToken(): string {
  const expires = Date.now() + MAX_AGE * 1000;
  const payload = String(expires);
  return `${payload}.${sign(payload)}`;
}

// Verifica que un token sea válido y no haya expirado.
function isValidToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  // Comparación segura contra ataques de tiempo.
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  const expires = parseInt(payload, 10);
  return Number.isFinite(expires) && expires > Date.now();
}

// ¿La contraseña ingresada es correcta?
export function checkPassword(password: string): boolean {
  const real = process.env.ADMIN_PASSWORD || "";
  if (!real) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(real);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Inicia sesión: escribe la cookie firmada.
export async function createSession(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, makeToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

// Cierra sesión: borra la cookie.
export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

// ¿Hay una sesión válida ahora mismo?
export async function isLoggedIn(): Promise<boolean> {
  const jar = await cookies();
  return isValidToken(jar.get(COOKIE_NAME)?.value);
}
