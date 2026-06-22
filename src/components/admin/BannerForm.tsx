"use client";

import { useState } from "react";
import Link from "next/link";
import type { Banner } from "@/lib/types";
import { saveBannerAction } from "@/app/admin/promos-actions";

export default function BannerForm({ banner }: { banner?: Banner }) {
  const isEdit = !!banner;
  const [preview, setPreview] = useState<string | undefined>(banner?.image);

  const field =
    "w-full border border-line rounded-lg px-3 py-2 focus:outline-none focus:border-accent";

  return (
    <form action={saveBannerAction} className="space-y-6 max-w-2xl">
      {isEdit && <input type="hidden" name="id" value={banner!.id} />}
      <input type="hidden" name="imagePath" value={banner?.image || ""} />

      <div className="bg-background border border-line rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-sm mb-1.5">
            Texto pequeño de arriba <span className="text-muted">(opcional)</span>
          </label>
          <input
            name="eyebrow"
            defaultValue={banner?.eyebrow}
            className={field}
            placeholder="Ej: Nueva temporada"
          />
        </div>
        <div>
          <label className="block text-sm mb-1.5">Título grande</label>
          <input
            name="title"
            required
            defaultValue={banner?.title}
            className={field}
            placeholder="Ej: Ropa de baño"
          />
        </div>
        <div>
          <label className="block text-sm mb-1.5">
            Descripción <span className="text-muted">(opcional)</span>
          </label>
          <textarea
            name="text"
            rows={2}
            defaultValue={banner?.text}
            className={field}
            placeholder="Ej: Disfruta el verano con nuestra colección."
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1.5">Texto del botón</label>
            <input
              name="cta"
              defaultValue={banner?.cta}
              className={field}
              placeholder="Ej: Ver colección"
            />
          </div>
          <div>
            <label className="block text-sm mb-1.5">A dónde lleva el botón</label>
            <input
              name="href"
              defaultValue={banner?.href}
              className={field}
              placeholder="Ej: /tienda?cat=shorts"
            />
          </div>
        </div>
      </div>

      {/* Foto */}
      <div className="bg-background border border-line rounded-xl p-5">
        <label className="block text-sm mb-3 font-medium">Imagen del banner</label>
        <div className="flex items-center gap-4">
          <div className="w-32 h-24 placeholder-box rounded-lg overflow-hidden flex-shrink-0">
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
              name="imageFile"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setPreview(URL.createObjectURL(f));
              }}
              className="text-sm"
            />
            <p className="text-xs text-muted mt-2">
              {isEdit
                ? "Si no eliges otra, se mantiene la imagen actual."
                : "Recomendado: foto vertical (3:4), JPG/PNG/WEBP."}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-background border border-line rounded-xl p-5">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={banner ? banner.active : true}
          />
          Mostrar este banner en el inicio
        </label>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="bg-accent text-white px-6 py-2.5 rounded-lg font-medium hover:bg-accent-dark transition"
        >
          {isEdit ? "Guardar cambios" : "Crear banner"}
        </button>
        <Link
          href="/admin/promociones"
          className="px-6 py-2.5 rounded-lg border border-line text-sm hover:bg-soft transition flex items-center"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
