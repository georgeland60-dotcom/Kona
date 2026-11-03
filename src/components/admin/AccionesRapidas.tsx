"use client";

// =============================================================
//  CAMBIOS RÁPIDOS EN LA LISTA DE PRODUCTOS
//
//  Mover de categoría y poner en favoritos son los dos cambios que más
//  se hacen y los que más costaban: había que abrir la ficha entera,
//  bajar hasta el campo y guardar. Aquí se hacen desde la propia fila.
//
//  El desplegable se guarda solo al elegir: pedir además un botón
//  "guardar" por fila es justo el paso de más que hace que nadie lo use.
// =============================================================

import { useTransition } from "react";
import type { Category } from "@/lib/types";
import {
  cambiarCategoriaAction,
  destacarAction,
} from "@/app/admin/productos-actions";

export function SelectorCategoria({
  id,
  categoria,
  categorias,
}: {
  id: string;
  categoria: string;
  categorias: Category[];
}) {
  const [guardando, empezar] = useTransition();

  return (
    <select
      value={categoria}
      disabled={guardando}
      aria-label="Categoría del producto"
      onChange={(e) => {
        const valor = e.target.value;
        const datos = new FormData();
        datos.set("id", id);
        datos.set("category", valor);
        empezar(() => {
          cambiarCategoriaAction(datos);
        });
      }}
      className={`border border-line rounded-lg px-2 py-1 text-xs bg-background max-w-[11rem] ${
        guardando ? "opacity-50" : ""
      }`}
    >
      {/* Si el producto trae una categoría que ya no está en la lista,
          se enseña igual: esconderla haría que al tocar cualquier otra
          cosa se la cambiara sin querer. */}
      {!categorias.some((c) => c.slug === categoria) && (
        <option value={categoria}>{categoria}</option>
      )}
      {categorias.map((c) => (
        <option key={c.slug} value={c.slug}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

export function BotonFavorito({
  id,
  destacado,
}: {
  id: string;
  destacado: boolean;
}) {
  const [guardando, empezar] = useTransition();

  return (
    <button
      type="button"
      disabled={guardando}
      title={
        destacado
          ? "Quitar de 'Lo que amamos' del inicio"
          : "Mostrar en 'Lo que amamos' del inicio"
      }
      aria-pressed={destacado}
      onClick={() => {
        const datos = new FormData();
        datos.set("id", id);
        empezar(() => {
          destacarAction(datos);
        });
      }}
      className={`text-lg leading-none transition ${
        guardando ? "opacity-40" : "hover:scale-110"
      } ${destacado ? "text-accent" : "text-line hover:text-muted"}`}
    >
      {destacado ? "★" : "☆"}
    </button>
  );
}
