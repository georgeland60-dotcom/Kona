import { redirect } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import Sidebar from "@/components/admin/Sidebar";

export const metadata = { title: "Panel · Kona" };

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Candado: si no hay sesión válida, manda al login.
  if (!(await isLoggedIn())) redirect("/admin/login");

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-soft">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 max-w-5xl">{children}</main>
    </div>
  );
}
