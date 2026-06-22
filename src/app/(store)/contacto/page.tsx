import type { Metadata } from "next";
import { store } from "@/config/store";

export const metadata: Metadata = {
  title: `Contáctenos · ${store.name}`,
};

export default function Contacto() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 md:py-24">
      <h1 className="font-script text-5xl text-accent mb-6 text-center">
        Contáctenos
      </h1>
      <p className="text-muted text-center mb-10 leading-relaxed">
        ¿Tienes una consulta sobre tu pedido, tallas o disponibilidad? Escríbenos
        y te ayudamos en todo momento.
      </p>

      <div className="space-y-4">
        <a
          href={`https://wa.me/${store.whatsapp}`}
          target="_blank"
          className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-3 rounded-full font-medium hover:opacity-90 transition"
        >
          Escríbenos por WhatsApp
        </a>
        <a
          href={store.instagram}
          target="_blank"
          className="block text-center w-full border border-line py-3 rounded-full hover:border-foreground transition"
        >
          Síguenos en Instagram
        </a>
        <a
          href={store.facebook}
          target="_blank"
          className="block text-center w-full border border-line py-3 rounded-full hover:border-foreground transition"
        >
          Síguenos en Facebook
        </a>
      </div>

      <p className="text-center text-xs text-muted mt-10">
        Hacemos delivery a todo Lima · Cambios hasta 7 días después de la compra
      </p>
    </div>
  );
}
