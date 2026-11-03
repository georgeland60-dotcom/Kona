import { getDatosDePago, hayDatosDePago } from "@/lib/pagos-data";
import { guardarDatosDePagoAction } from "@/app/admin/pagos-actions";

export const dynamic = "force-dynamic";

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string }>;
}) {
  const [datos, { guardado }] = await Promise.all([
    getDatosDePago(),
    searchParams,
  ]);

  const campo =
    "w-full border border-line rounded-lg px-3 py-2 focus:outline-none focus:border-accent";
  const caja = "bg-background border border-line rounded-xl p-5 space-y-4";

  return (
    <div>
      <h1 className="text-2xl font-semibold">Cómo te pagan</h1>
      <p className="text-muted text-sm mt-1 mb-6">
        Lo que ve la clienta cuando elige pagar por Yape, Plin o
        transferencia. Lo que dejes vacío, no se le muestra.
      </p>

      {guardado && (
        <p className="mb-5 text-sm bg-green-50 text-green-700 border border-green-200 rounded-lg px-4 py-2.5">
          Guardado. Ya se ve en el carrito.
        </p>
      )}

      {!hayDatosDePago(datos) && (
        <p className="mb-5 text-sm bg-amber-50 text-amber-900 border border-amber-200 rounded-lg px-4 py-3">
          Todavía no hay ningún dato cargado. Mientras tanto, a quien elija
          esa forma de pago se le dice que le pasas los datos por WhatsApp.
        </p>
      )}

      <form action={guardarDatosDePagoAction} className="space-y-6 max-w-2xl">
        <div className={caja}>
          <p className="text-sm font-medium">Yape</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1.5">Número</label>
              <input
                name="yapeNumero"
                defaultValue={datos.yape?.numero}
                className={campo}
                placeholder="987 654 321"
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">A nombre de</label>
              <input
                name="yapeTitular"
                defaultValue={datos.yape?.titular}
                className={campo}
                placeholder="Nombre que sale en el Yape"
              />
            </div>
          </div>
        </div>

        <div className={caja}>
          <p className="text-sm font-medium">Plin</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1.5">Número</label>
              <input
                name="plinNumero"
                defaultValue={datos.plin?.numero}
                className={campo}
                placeholder="987 654 321"
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">A nombre de</label>
              <input
                name="plinTitular"
                defaultValue={datos.plin?.titular}
                className={campo}
              />
            </div>
          </div>
        </div>

        <div className={caja}>
          <p className="text-sm font-medium">Transferencia bancaria</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1.5">Banco</label>
              <input
                name="bancoNombre"
                defaultValue={datos.banco?.banco}
                className={campo}
                placeholder="BCP, Interbank…"
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Tipo de cuenta</label>
              <input
                name="bancoTipo"
                defaultValue={datos.banco?.tipo}
                className={campo}
                placeholder="Ahorros soles"
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Número de cuenta</label>
              <input
                name="bancoNumero"
                defaultValue={datos.banco?.numero}
                className={campo}
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">
                CCI <span className="text-muted">(para otros bancos)</span>
              </label>
              <input
                name="bancoCci"
                defaultValue={datos.banco?.cci}
                className={campo}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1.5">A nombre de</label>
              <input
                name="bancoTitular"
                defaultValue={datos.banco?.titular}
                className={campo}
              />
            </div>
          </div>
        </div>

        <div className={caja}>
          <label className="block text-sm mb-1.5">
            Una línea más para quien paga{" "}
            <span className="text-muted">(opcional)</span>
          </label>
          <input
            name="nota"
            defaultValue={datos.nota}
            className={campo}
            placeholder="Pon tu nombre en el concepto, porfa 💛"
          />
        </div>

        <button
          type="submit"
          className="bg-accent text-white px-6 py-2.5 rounded-lg font-medium hover:bg-accent-dark transition"
        >
          Guardar
        </button>
      </form>
    </div>
  );
}
