import type { Metadata } from "next";
import { store } from "@/config/store";

export const metadata: Metadata = {
  title: `Nosotros · ${store.name}`,
};

export default function Nosotros() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 md:py-24">
      <h1 className="font-script text-5xl text-accent mb-6 text-center">
        Nosotros
      </h1>
      <div className="space-y-5 text-muted leading-relaxed">
        <p>
          En {store.name} creemos que la moda femenina debe ser cómoda, versátil
          y para todos los cuerpos. Seleccionamos cada prenda pensando en
          mujeres reales que quieren verse y sentirse bien todos los días.
        </p>
        <p>
          Nuestra propuesta nace para acompañarte en cada momento: desde un día
          de playa hasta una salida especial. Trabajamos con telas de calidad y
          diseños pensados para resaltar tu mejor versión.
        </p>
        <p>
          Hacemos delivery a todo Lima y te acompañamos en todo el proceso de
          compra. Gracias por ser parte de la familia {store.name}.
        </p>
      </div>
    </div>
  );
}
