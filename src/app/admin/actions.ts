"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword, createSession, destroySession } from "@/lib/auth";
import { limpiarIp, permitirIntento } from "@/lib/intentos-login";

// Acción del formulario de login.
export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") || "");

  // Si no hay contraseña configurada, NINGUNA funciona. Decir solo
  // "contraseña incorrecta" manda a buscar por el lado equivocado: uno
  // prueba una y otra vez sin saber que el problema es otro.
  if (!process.env.ADMIN_PASSWORD) {
    redirect("/admin/login?error=sin-clave");
  }

  // Freno a la fuerza bruta: pocos intentos por dirección cada 15 min.
  const h = await headers();
  const ip = limpiarIp(h.get("x-forwarded-for") || h.get("x-real-ip"));
  if (!(await permitirIntento(ip))) {
    // Queda en los registros de Vercel: si alguien está probando
    // contraseñas, se ve desde dónde.
    console.warn(`[panel] demasiados intentos de entrar desde ${ip}`);
    redirect("/admin/login?error=espera");
  }

  if (!checkPassword(password)) {
    console.warn(`[panel] contraseña incorrecta desde ${ip}`);
    redirect("/admin/login?error=1");
  }
  console.log(`[panel] entrada al panel desde ${ip}`);
  await createSession();
  redirect("/admin");
}

// Cerrar sesión.
export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}
