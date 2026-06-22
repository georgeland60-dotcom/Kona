"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isLoggedIn } from "@/lib/auth";
import { setOrderStatus } from "@/lib/orders-data";
import type { OrderStatus } from "@/lib/types";

function refresh() {
  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/inventario");
}

// Cambia el estado de un pedido desde el panel.
// Marcar "pagado" descuenta el stock (una sola vez).
export async function changeOrderStatusAction(formData: FormData) {
  if (!(await isLoggedIn())) redirect("/admin/login");
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "") as OrderStatus;
  const valid: OrderStatus[] = ["pendiente", "pagado", "cancelado"];
  if (id && valid.includes(status)) {
    await setOrderStatus(id, status);
    refresh();
  }
  redirect(`/admin/pedidos/${id}`);
}
