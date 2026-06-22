import type { Metadata } from "next";
import { store } from "@/config/store";

export const metadata: Metadata = {
  title: `Cuidados de tus prendas · ${store.name}`,
};

export default function Cuidados() {
  const tips = [
    "Lava tus prendas a mano o en ciclo delicado con agua fría.",
    "Voltea la prenda al revés antes de lavarla para proteger los colores.",
    "Evita el uso de lejía o blanqueadores.",
    "No retuerzas las prendas; presiona suavemente para quitar el exceso de agua.",
    "Seca a la sombra, evita la exposición directa al sol.",
    "Plancha a temperatura baja y, de preferencia, del revés.",
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 md:py-24">
      <h1 className="font-script text-5xl text-accent mb-8 text-center">
        Cuidados al lavar nuestras prendas
      </h1>
      <p className="text-muted text-center mb-8 leading-relaxed">
        Para que tus prendas {store.name} se mantengan como nuevas por más
        tiempo, te recomendamos seguir estos cuidados:
      </p>
      <ul className="space-y-3">
        {tips.map((t) => (
          <li key={t} className="flex gap-3 text-sm text-muted">
            <span className="text-accent">✓</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
