"use client";

import { useState } from "react";
import Link from "next/link";
import type { Category, DiscountRule } from "@/lib/types";
import { saveRuleAction } from "@/app/admin/promos-actions";

type ProductOption = { id: string; name: string };

// Pasa una fecha ISO a formato YYYY-MM-DD para el input date.
function toDateInput(iso?: string): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export default function RuleForm({
  rule,
  categories,
  products,
}: {
  rule?: DiscountRule;
  categories: Category[];
  products: ProductOption[];
}) {
  const isEdit = !!rule;
  const [scope, setScope] = useState<DiscountRule["scope"]>(rule?.scope || "all");

  const field =
    "w-full border border-line rounded-lg px-3 py-2 focus:outline-none focus:border-accent";

  return (
    <form action={saveRuleAction} className="space-y-6 max-w-2xl">
      {isEdit && <input type="hidden" name="id" value={rule!.id} />}

      <div className="bg-background border border-line rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-sm mb-1.5">Nombre del descuento</label>
          <input
            name="name"
            required
            defaultValue={rule?.name}
            className={field}
            placeholder="Ej: Cyber Wow 20%"
          />
          <p className="text-xs text-muted mt-1">
            Solo lo ves tú en el panel; no aparece en la tienda.
          </p>
        </div>

        <div>
          <label className="block text-sm mb-1.5">¿A qué aplica?</label>
          <select
            name="scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as DiscountRule["scope"])}
            className={field}
          >
            <option value="all">Toda la tienda</option>
            <option value="category">Una categoría</option>
            <option value="product">Un producto</option>
          </select>
        </div>

        {scope === "category" && (
          <div>
            <label className="block text-sm mb-1.5">Categoría</label>
            <select
              name="targetCategory"
              defaultValue={rule?.scope === "category" ? rule.target : ""}
              className={field}
            >
              <option value="" disabled>
                Elige una categoría
              </option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {scope === "product" && (
          <div>
            <label className="block text-sm mb-1.5">Producto</label>
            <select
              name="targetProduct"
              defaultValue={rule?.scope === "product" ? rule.target : ""}
              className={field}
            >
              <option value="" disabled>
                Elige un producto
              </option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1.5">Tipo de descuento</label>
            <select
              name="kind"
              defaultValue={rule?.kind || "percent"}
              className={field}
            >
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
              className={field}
              placeholder="Ej: 20"
            />
          </div>
        </div>
      </div>

      {/* Vigencia */}
      <div className="bg-background border border-line rounded-xl p-5 space-y-4">
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
              className={field}
            />
          </div>
          <div>
            <label className="block text-sm mb-1.5">Hasta</label>
            <input
              name="endsAt"
              type="date"
              defaultValue={toDateInput(rule?.endsAt)}
              className={field}
            />
          </div>
        </div>
        <p className="text-xs text-muted">
          Si lo dejas vacío, el descuento aplica sin fecha límite (mientras esté
          activo).
        </p>
      </div>

      <div className="bg-background border border-line rounded-xl p-5">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={rule ? rule.active : true}
          />
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
