"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isLoggedIn } from "@/lib/auth";
import { MAX_CUENTAS, guardarDatosDePago } from "@/lib/pagos-data";
import { registrarPago } from "@/lib/orders-data";
import type { PagoManual } from "@/lib/types";

// Los datos a los que paga la clienta (Yape, Plin, banco).
export async function guardarDatosDePagoAction(formData: FormData) {
  if (!(await isLoggedIn())) redirect("/admin/login");

  const t = (campo: string) => String(formData.get(campo) || "").trim();

  await guardarDatosDePago({
    yape: { numero: t("yapeNumero"), titular: t("yapeTitular") },
    plin: { numero: t("plinNumero"), titular: t("plinTitular") },
    bancos: Array.from({ length: MAX_CUENTAS }, (_, i) => ({
      banco: t(`banco${i}Nombre`),
      tipo: t(`banco${i}Tipo`),
      numero: t(`banco${i}Numero`),
      cci: t(`banco${i}Cci`),
      titular: t(`banco${i}Titular`),
    })),
    provinciaSoloYapePlin: formData.get("provinciaSoloYapePlin") === "on",
    nota: t("nota"),
  });

  revalidatePath("/admin/pagos");
  redirect("/admin/pagos?guardado=1");
}

// Dar por pagado un pedido que se pagó por fuera de la pasarela.
// Es el mismo registro que hace el asistente por Telegram: queda
// constancia de con qué se pagó y quién lo dio por bueno.
export async function registrarPagoAction(formData: FormData) {
  if (!(await isLoggedIn())) redirect("/admin/login");

  const id = String(formData.get("id") || "").trim();
  if (!id) return;

  const metodo = String(formData.get("metodo") || "transferencia");
  const permitidos: PagoManual["metodo"][] = [
    "yape",
    "plin",
    "transferencia",
    "efectivo",
    "otro",
  ];

  await registrarPago(id, {
    metodo: (permitidos as string[]).includes(metodo)
      ? (metodo as PagoManual["metodo"])
      : "otro",
    nota: String(formData.get("nota") || "").trim().slice(0, 300) || undefined,
    registradoPor: "panel",
  });

  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${id}`);
  redirect(`/admin/pedidos/${id}`);
}
