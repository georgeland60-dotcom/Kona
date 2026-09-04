"use server";

import { redirect } from "next/navigation";
import { checkPassword, createSession, destroySession } from "@/lib/auth";

// Acción del formulario de login.
export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") || "");

  // Si no hay contraseña configurada, NINGUNA funciona. Decir solo
  // "contraseña incorrecta" manda a buscar por el lado equivocado: uno
  // prueba una y otra vez sin saber que el problema es otro.
  if (!process.env.ADMIN_PASSWORD) {
    redirect("/admin/login?error=sin-clave");
  }
  if (!checkPassword(password)) {
    redirect("/admin/login?error=1");
  }
  await createSession();
  redirect("/admin");
}

// Cerrar sesión.
export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}
