"use client";

import { useState } from "react";
import Link from "next/link";
import type { Product, Category } from "@/lib/types";
import { saveProductAction } from "@/app/admin/productos-actions";

type Row = { size: string; stock: number };

export default function ProductForm({
  product,
  categories,
}: {
  product?: Product;
  categories: Category[];
}) {
  const isEdit = !!product;
  const [rows, setRows] = useState<Row[]>(
    product?.variants?.length
      ? product.variants.map((v) => ({ size: v.size, stock: v.stock }))
      : [
          { size: "S", stock: 10 },
          { size: "M", stock: 10 },
          { size: "L", stock: 10 },
        ]
  );
  const [preview, setPreview] = useState<string | undefined>(product?.image);

  const updateRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, { size: "", stock: 0 }]);
  const removeRow = (i: number) =>
    setRows((rs) => rs.filter((_, idx) => idx !== i));

  const field =
    "w-full border border-line rounded-lg px-3 py-2 focus:outline-none focus:border-accent";

  return (
    <form action={saveProductAction} className="space-y-6 max-w-2xl">
      {isEdit && <input type="hidden" name="id" value={product!.id} />}
      <input type="hidden" name="current_image" value={product?.image || ""} />

      {/* Datos básicos */}
      <div className="bg-background border border-line rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-sm mb-1.5">Nombre del producto</label>
          <input
            name="name"
            required
            defaultValue={product?.name}
            className={field}
            placeholder="Ej: Vestido Pams verde"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1.5">
              Precio (S/)
            </label>
            <input
              name="price"
              type="number"
              min={0}
              step="0.01"
              required
              defaultValue={product?.price}
              className={field}
            />
          </div>
          <div>
            <label className="block text-sm mb-1.5">
              Precio anterior <span className="text-muted">(opcional)</span>
            </label>
            <input
              name="oldPrice"
              type="number"
              min={0}
              step="0.01"
              defaultValue={product?.oldPrice}
              className={field}
              placeholder="Para mostrar oferta"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1.5">Categoría</label>
          <select
            name="category"
            required
            defaultValue={product?.category || ""}
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

        <div>
          <label className="block text-sm mb-1.5">
            Descripción <span className="text-muted">(opcional)</span>
          </label>
          <textarea
            name="description"
            rows={3}
            defaultValue={product?.description}
            className={field}
            placeholder="Tela, detalles, recomendaciones..."
          />
        </div>

        <div>
          <label className="block text-sm mb-1.5">
            Enlace (URL) <span className="text-muted">(opcional, se crea solo)</span>
          </label>
          <input
            name="slug"
            defaultValue={product?.slug}
            className={field}
            placeholder="vestido-pams-verde"
          />
        </div>
      </div>

      {/* Foto */}
      <div className="bg-background border border-line rounded-xl p-5">
        <label className="block text-sm mb-3 font-medium">Foto principal</label>
        <div className="flex items-center gap-4">
          <div className="w-24 h-32 placeholder-box rounded-lg overflow-hidden flex-shrink-0">
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Vista previa"
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div>
            <input
              type="file"
              name="image"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setPreview(URL.createObjectURL(f));
              }}
              className="text-sm"
            />
            <p className="text-xs text-muted mt-2">
              {isEdit
                ? "Si no eliges otra, se mantiene la foto actual."
                : "JPG, PNG o WEBP."}
            </p>
          </div>
        </div>
      </div>

      {/* Tallas + stock */}
      <div className="bg-background border border-line rounded-xl p-5">
        <label className="block text-sm mb-3 font-medium">
          Tallas y stock
        </label>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                name="variant_size"
                value={r.size}
                onChange={(e) => updateRow(i, { size: e.target.value })}
                placeholder="Talla (S, M, Única...)"
                className={`${field} flex-1`}
              />
              <input
                name="variant_stock"
                type="number"
                min={0}
                value={r.stock}
                onChange={(e) =>
                  updateRow(i, { stock: Number(e.target.value) || 0 })
                }
                placeholder="Stock"
                className={`${field} w-28`}
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                aria-label="Quitar talla"
                className="text-muted hover:text-red-600 px-2 text-xl"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addRow}
          className="mt-3 text-sm text-accent hover:underline"
        >
          + Agregar talla
        </button>
        <p className="text-xs text-muted mt-2">
          El código (SKU) de cada talla se genera solo al guardar.
        </p>
      </div>

      {/* Opciones */}
      <div className="bg-background border border-line rounded-xl p-5 space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={product ? product.active !== false : true}
          />
          Visible en la tienda
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={product?.featured}
          />
          Mostrar en “Favoritos” del inicio
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="onSale"
            defaultChecked={product?.onSale}
          />
          Está en oferta (Sale)
        </label>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="bg-accent text-white px-6 py-2.5 rounded-lg font-medium hover:bg-accent-dark transition"
        >
          {isEdit ? "Guardar cambios" : "Crear producto"}
        </button>
        <Link
          href="/admin/productos"
          className="px-6 py-2.5 rounded-lg border border-line text-sm hover:bg-soft transition flex items-center"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
