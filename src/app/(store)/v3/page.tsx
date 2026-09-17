import { redirect } from "next/navigation";

// El diseño nuevo ya vive en el inicio ("/"). Esta ruta se queda solo para
// que los enlaces de /v3 que ya se compartieron sigan funcionando.
export default function V3() {
  redirect("/");
}
