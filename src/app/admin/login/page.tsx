import { redirect } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import { loginAction } from "@/app/admin/actions";

export const metadata = { title: "Entrar · Panel Kona" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Si ya está logueada, directo al panel.
  if (await isLoggedIn()) redirect("/admin");

  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-soft px-4">
      <div className="w-full max-w-sm bg-background border border-line rounded-2xl shadow-sm p-8">
        <div className="text-center mb-6">
          <h1 className="font-script text-5xl text-accent">Kona</h1>
          <p className="text-sm text-muted mt-1">Panel de administración</p>
        </div>

        {error === "sin-clave" ? (
          <div className="mb-4 text-sm bg-amber-50 border border-amber-300 rounded-lg px-3 py-3">
            <p className="font-semibold mb-1">
              Todavía no hay contraseña configurada
            </p>
            <p className="text-muted">
              No es que te equivocaras: aún no existe ninguna contraseña, así
              que ninguna funciona. Hay que crear la variable{" "}
              <code className="text-xs">ADMIN_PASSWORD</code> en Vercel con la
              contraseña que quieras, y volver a desplegar.
            </p>
          </div>
        ) : error ? (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
            Contraseña incorrecta. Inténtalo de nuevo.
          </p>
        ) : null}

        <form action={loginAction} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm mb-1.5">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              className="w-full border border-line rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-accent text-white py-2.5 rounded-lg font-medium hover:bg-accent-dark transition"
          >
            Entrar
          </button>
        </form>

        <p className="text-center text-xs text-muted mt-6">
          Solo se pide contraseña: no hay usuario.
        </p>
      </div>
    </div>
  );
}
