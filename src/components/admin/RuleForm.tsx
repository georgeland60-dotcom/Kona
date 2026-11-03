"use client";

// =============================================================
//  EL FORMULARIO DE UN DESCUENTO
//
//  Hasta ahora solo sabía hacer "un porcentaje sobre una categoría".
//  Todo lo demás —2x1, por cantidad, sobre el total, envío gratis,
//  "todo menos estos dos"— había que pedírselo al asistente por
//  Telegram, y desde el panel ni siquiera se veía bien qué hacía una
//  promoción ya creada. Aquí está todo lo que el motor sabe hacer.
//
//  Una sola idea de diseño: primero se elige QUÉ CLASE de promoción es,
//  y según eso aparecen sus campos. Enseñar los veinte a la vez es la
//  forma segura de que nadie entienda ninguno.
// =============================================================

import { useState } from "react";
import Link from "next/link";
import type { Category, DiscountRule, DiscountType, Tramo } from "@/lib/types";
import { saveRuleAction } from "@/app/admin/promos-actions";

type ProductOption = { id: string; name: string; category: string };

function toDateInput(iso?: string): string {
  return iso ? iso.slice(0, 10) : "";
}

const CLASES: { valor: DiscountType; titulo: string; ejemplo: string }[] = [
  {
    valor: "simple",
    titulo: "Descuento directo",
    ejemplo: "20% en vestidos · S/ 30 menos · todos a S/ 89",
  },
  {
    valor: "bogo",
    titulo: "2x1 y la segunda rebajada",
    ejemplo: "Lleva 2 paga 1 · la 2da al 50%",
  },
  {
    valor: "escalonado",
    titulo: "Por cantidad",
    ejemplo: "2 prendas 10%, 3 o más 15%",
  },
  {
    valor: "carrito",
    titulo: "Sobre el total de la compra",
    ejemplo: "10% de toda la compra si llevas una cartera, tope S/ 85",
  },
  {
    valor: "envio",
    titulo: "Envío gratis",
    ejemplo: "Envío gratis desde S/ 150 · gratis en Lima",
  },
];

export default function RuleForm({
  rule,
  categories,
  products,
  destinos,
}: {
  rule?: DiscountRule;
  categories: Category[];
  products: ProductOption[];
  destinos: string[];
}) {
  const isEdit = !!rule;
  const [tipo, setTipo] = useState<DiscountType>(rule?.tipo ?? "simple");

  // A qué apunta. Las reglas viejas traen scope/target; las nuevas, un
  // filtro con listas. Se lee lo que haya y se enseña igual.
  const f = rule?.filtro;
  const alcanceInicial: "todos" | "categorias" | "productos" = f
    ? f.productos?.length
      ? "productos"
      : f.categorias?.length
        ? "categorias"
        : "todos"
    : rule?.scope === "category"
      ? "categorias"
      : rule?.scope === "product"
        ? "productos"
        : "todos";
  const [alcance, setAlcance] = useState(alcanceInicial);

  const catsIniciales =
    f?.categorias ?? (rule?.scope === "category" && rule.target ? [rule.target] : []);
  const prodsIniciales =
    f?.productos ?? (rule?.scope === "product" && rule.target ? [rule.target] : []);

  const [tramos, setTramos] = useState<Tramo[]>(
    rule?.tramos?.length
      ? rule.tramos
      : [
          { desde: 2, kind: "percent", value: 10 },
          { desde: 3, kind: "percent", value: 15 },
        ]
  );

  const [buscar, setBuscar] = useState("");
  const [excluir, setExcluir] = useState(
    !!(f?.excluirCategorias?.length || f?.excluirProductos?.length)
  );

  const campo =
    "w-full border border-line rounded-lg px-3 py-2 focus:outline-none focus:border-accent";
  const caja = "bg-background border border-line rounded-xl p-5 space-y-4";

  const filtrados = products.filter((p) =>
    p.name.toLowerCase().includes(buscar.trim().toLowerCase())
  );

  // Las de envío no apuntan a productos: regalan el envío de la compra
  // entera. Enseñar ahí un selector de categorías solo confunde.
  const eligeProductos = tipo !== "envio" && tipo !== "carrito";

  return (
    <form action={saveRuleAction} className="space-y-6 max-w-2xl">
      {isEdit && <input type="hidden" name="id" value={rule!.id} />}

      {/* ---- Qué clase de promoción es ---- */}
      <div className={caja}>
        <div>
          <label className="block text-sm mb-1.5">Nombre del descuento</label>
          <input
            name="name"
            required
            defaultValue={rule?.name}
            className={campo}
            placeholder="Ej: Cyber Wow 20%"
          />
          <p className="text-xs text-muted mt-1">
            Lo ve la clienta en el carrito cuando la promoción le aplica.
          </p>
        </div>

        <div>
          <p className="text-sm mb-2">¿Qué clase de promoción es?</p>
          <div className="space-y-2">
            {CLASES.map((c) => (
              <label
                key={c.valor}
                className={`flex gap-3 items-start border rounded-lg px-3 py-2.5 cursor-pointer transition ${
                  tipo === c.valor
                    ? "border-accent bg-accent/5"
                    : "border-line hover:border-foreground/30"
                }`}
              >
                <input
                  type="radio"
                  name="tipo"
                  value={c.valor}
                  checked={tipo === c.valor}
                  onChange={() => setTipo(c.valor)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium">{c.titulo}</span>
                  <span className="block text-xs text-muted">{c.ejemplo}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Descuento directo ---- */}
      {tipo === "simple" && (
        <div className={caja}>
          <p className="text-sm font-medium">Cuánto se rebaja</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1.5">Tipo</label>
              <select name="kind" defaultValue={rule?.kind || "percent"} className={campo}>
                <option value="percent">Porcentaje (%)</option>
                <option value="fixed">Monto fijo (S/ menos)</option>
                <option value="precio_fijo">Precio final (todos a S/ …)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1.5">Valor</label>
              <input
                name="value"
                type="number"
                min={0}
                step="0.01"
                required
                defaultValue={rule?.value}
                className={campo}
                placeholder="Ej: 20"
              />
            </div>
          </div>
        </div>
      )}

      {/* ---- 2x1 ---- */}
      {tipo === "bogo" && (
        <div className={caja}>
          <p className="text-sm font-medium">Cómo funciona</p>
          <p className="text-xs text-muted">
            Se regala siempre la unidad más barata de las que entran, que es
            lo que espera la clienta.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1.5">Por cada</label>
              <input
                name="porCada"
                type="number"
                min={1}
                defaultValue={rule?.bogo?.porCada ?? 2}
                className={campo}
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Se rebajan</label>
              <input
                name="regala"
                type="number"
                min={1}
                defaultValue={rule?.bogo?.regala ?? 1}
                className={campo}
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Rebaja (%)</label>
              <input
                name="descuentoRegalo"
                type="number"
                min={1}
                max={100}
                defaultValue={rule?.bogo?.descuentoRegalo ?? 100}
                className={campo}
              />
              <p className="text-xs text-muted mt-1">100 = gratis</p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="recursivo"
              defaultChecked={rule?.bogo?.recursivo ?? true}
            />
            Se repite en la misma compra (llevando 4 se regalan 2)
          </label>
          <div>
            <label className="block text-sm mb-1.5">
              Máximo de unidades regaladas por compra{" "}
              <span className="text-muted">(opcional)</span>
            </label>
            <input
              name="maximoRegalos"
              type="number"
              min={1}
              defaultValue={rule?.bogo?.maximoRegalos ?? ""}
              className={campo}
              placeholder="Sin tope"
            />
          </div>
        </div>
      )}

      {/* ---- Por cantidad ---- */}
      {tipo === "escalonado" && (
        <div className={caja}>
          <p className="text-sm font-medium">Los tramos</p>
          <p className="text-xs text-muted">
            Cuántas unidades hay que llevar (de las que entran en la promoción)
            y qué se rebaja en cada caso. Deja &quot;hasta&quot; vacío en el
            último para que no tenga tope.
          </p>
          {tramos.map((t, i) => (
            <div key={i} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
              <div>
                <label className="block text-xs text-muted mb-1">Desde</label>
                <input
                  name="tramoDesde"
                  type="number"
                  min={1}
                  defaultValue={t.desde}
                  className={campo}
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Hasta</label>
                <input
                  name="tramoHasta"
                  type="number"
                  min={1}
                  defaultValue={t.hasta ?? ""}
                  className={campo}
                  placeholder="∞"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Tipo</label>
                <select name="tramoKind" defaultValue={t.kind} className={campo}>
                  <option value="percent">%</option>
                  <option value="fixed">S/ menos</option>
                  <option value="precio_fijo">Precio final</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Valor</label>
                <input
                  name="tramoValue"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={t.value}
                  className={campo}
                />
              </div>
              <button
                type="button"
                onClick={() => setTramos(tramos.filter((_, j) => j !== i))}
                className="text-xs text-muted underline h-10"
              >
                Quitar
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setTramos([...tramos, { desde: 1, kind: "percent", value: 10 }])
            }
            className="text-sm text-accent underline"
          >
            + Añadir tramo
          </button>
        </div>
      )}

      {/* ---- Sobre el total ---- */}
      {tipo === "carrito" && (
        <div className={caja}>
          <p className="text-sm font-medium">Cuánto se rebaja del total</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1.5">Tipo</label>
              <select name="kind" defaultValue={rule?.kind || "percent"} className={campo}>
                <option value="percent">Porcentaje (%)</option>
                <option value="fixed">Monto fijo (S/)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1.5">Valor</label>
              <input
                name="value"
                type="number"
                min={0}
                step="0.01"
                required
                defaultValue={rule?.value}
                className={campo}
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">
                Tope <span className="text-muted">(S/)</span>
              </label>
              <input
                name="maximoDescuento"
                type="number"
                min={0}
                step="0.01"
                defaultValue={rule?.carrito?.maximoDescuento ?? ""}
                className={campo}
                placeholder="Sin tope"
              />
            </div>
          </div>
          <p className="text-xs text-muted">
            El tope es lo que evita que una compra grande se lleve media
            tienda. El descuento se calcula sobre lo que ya quedó rebajado por
            otras promociones, nunca sobre el precio de lista.
          </p>
        </div>
      )}

      {/* ---- Condición: común a "sobre el total" y "envío gratis" ---- */}
      {(tipo === "carrito" || tipo === "envio") && (
        <div className={caja}>
          <p className="text-sm font-medium">
            ¿Cuándo se activa? <span className="text-muted font-normal">(opcional)</span>
          </p>
          <p className="text-xs text-muted">
            Todo lo que pongas tiene que cumplirse a la vez. Si lo dejas vacío,
            aplica siempre.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1.5">Compra mínima (S/)</label>
              <input
                name="subtotalMinimo"
                type="number"
                min={0}
                step="0.01"
                defaultValue={
                  (tipo === "envio"
                    ? rule?.envio?.condicion?.subtotalMinimo
                    : rule?.carrito?.condicion?.subtotalMinimo) ?? ""
                }
                className={campo}
                placeholder="Sin mínimo"
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Unidades mínimas</label>
              <input
                name="cantidadMinima"
                type="number"
                min={1}
                defaultValue={
                  (tipo === "envio"
                    ? rule?.envio?.condicion?.cantidadMinima
                    : rule?.carrito?.condicion?.cantidadMinima) ?? ""
                }
                className={campo}
                placeholder="Sin mínimo"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1.5">
              Solo si lleva algo de estas categorías{" "}
              <span className="text-muted">(opcional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const marcadas =
                  (tipo === "envio"
                    ? rule?.envio?.condicion?.categorias
                    : rule?.carrito?.condicion?.categorias) ?? [];
                return (
                  <label
                    key={c.slug}
                    className="text-xs border border-line rounded-full px-3 py-1.5 cursor-pointer has-checked:border-accent has-checked:bg-accent/5"
                  >
                    <input
                      type="checkbox"
                      name="condicionCategorias"
                      value={c.slug}
                      defaultChecked={marcadas.includes(c.slug)}
                      className="mr-1.5 align-middle"
                    />
                    {c.name}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ---- Envío gratis: a qué destinos ---- */}
      {tipo === "envio" && (
        <div className={caja}>
          <p className="text-sm font-medium">
            ¿A qué destinos? <span className="text-muted font-normal">(opcional)</span>
          </p>
          <p className="text-xs text-muted">
            Sin marcar ninguno, el envío sale gratis a donde sea. Marca algunos
            para hacerlo solo en esas zonas.
          </p>
          <div className="max-h-48 overflow-y-auto border border-line rounded-lg p-3 flex flex-wrap gap-2">
            {destinos.map((d) => (
              <label
                key={d}
                className="text-xs border border-line rounded-full px-3 py-1.5 cursor-pointer"
              >
                <input
                  type="checkbox"
                  name="envioDestinos"
                  value={d}
                  defaultChecked={rule?.envio?.destinos?.includes(d)}
                  className="mr-1.5 align-middle"
                />
                {d}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ---- A qué productos aplica ---- */}
      {eligeProductos && (
        <div className={caja}>
          <p className="text-sm font-medium">¿A qué aplica?</p>
          <div className="flex gap-2 flex-wrap">
            {(
              [
                ["todos", "Toda la tienda"],
                ["categorias", "Algunas categorías"],
                ["productos", "Productos sueltos"],
              ] as const
            ).map(([valor, texto]) => (
              <label
                key={valor}
                className={`text-sm border rounded-full px-4 py-2 cursor-pointer transition ${
                  alcance === valor
                    ? "border-accent bg-accent/5"
                    : "border-line hover:border-foreground/30"
                }`}
              >
                <input
                  type="radio"
                  name="alcance"
                  value={valor}
                  checked={alcance === valor}
                  onChange={() => setAlcance(valor)}
                  className="mr-2 align-middle"
                />
                {texto}
              </label>
            ))}
          </div>

          {alcance === "categorias" && (
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <label
                  key={c.slug}
                  className="text-xs border border-line rounded-full px-3 py-1.5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    name="categorias"
                    value={c.slug}
                    defaultChecked={catsIniciales.includes(c.slug)}
                    className="mr-1.5 align-middle"
                  />
                  {c.name}
                </label>
              ))}
            </div>
          )}

          {alcance === "productos" && (
            <div>
              <input
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                placeholder="Buscar producto…"
                className={`${campo} mb-2`}
              />
              <div className="max-h-56 overflow-y-auto border border-line rounded-lg divide-y divide-line">
                {filtrados.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-soft"
                  >
                    <input
                      type="checkbox"
                      name="productos"
                      value={p.id}
                      defaultChecked={prodsIniciales.includes(p.id)}
                    />
                    {p.name}
                  </label>
                ))}
                {filtrados.length === 0 && (
                  <p className="px-3 py-2 text-sm text-muted">
                    Ningún producto con ese nombre.
                  </p>
                )}
              </div>
              {/* Los marcados que el buscador esconde se perderían al
                  guardar: van como campos ocultos. */}
              {products
                .filter(
                  (p) =>
                    prodsIniciales.includes(p.id) &&
                    !filtrados.some((q) => q.id === p.id)
                )
                .map((p) => (
                  <input key={p.id} type="hidden" name="productos" value={p.id} />
                ))}
            </div>
          )}

          <div className="border-t border-line pt-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={excluir}
                onChange={(e) => setExcluir(e.target.checked)}
              />
              Dejar algo fuera (&quot;todo menos…&quot;)
            </label>

            {excluir && (
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-xs text-muted mb-1.5">Categorías excluidas</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => (
                      <label
                        key={c.slug}
                        className="text-xs border border-line rounded-full px-3 py-1.5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          name="excluirCategorias"
                          value={c.slug}
                          defaultChecked={f?.excluirCategorias?.includes(c.slug)}
                          className="mr-1.5 align-middle"
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1.5">Productos excluidos</p>
                  <div className="max-h-40 overflow-y-auto border border-line rounded-lg divide-y divide-line">
                    {products.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-soft"
                      >
                        <input
                          type="checkbox"
                          name="excluirProductos"
                          value={p.id}
                          defaultChecked={f?.excluirProductos?.includes(p.id)}
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- Vigencia ---- */}
      <div className={caja}>
        <p className="text-sm font-medium">
          Vigencia <span className="text-muted font-normal">(opcional)</span>
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1.5">Desde</label>
            <input
              name="startsAt"
              type="date"
              defaultValue={toDateInput(rule?.startsAt)}
              className={campo}
            />
          </div>
          <div>
            <label className="block text-sm mb-1.5">Hasta</label>
            <input
              name="endsAt"
              type="date"
              defaultValue={toDateInput(rule?.endsAt)}
              className={campo}
            />
          </div>
        </div>
        <p className="text-xs text-muted">
          Vacío = sin fecha límite, mientras esté activa.
        </p>
      </div>

      <div className="bg-background border border-line rounded-xl p-5">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={rule ? rule.active : true} />
          Descuento activo
        </label>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="bg-accent text-white px-6 py-2.5 rounded-lg font-medium hover:bg-accent-dark transition"
        >
          {isEdit ? "Guardar cambios" : "Crear descuento"}
        </button>
        <Link
          href="/admin/descuentos"
          className="px-6 py-2.5 rounded-lg border border-line text-sm hover:bg-soft transition flex items-center"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
