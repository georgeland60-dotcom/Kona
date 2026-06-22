import type { Metadata } from "next";
import { store } from "@/config/store";

export const metadata: Metadata = {
  title: `Políticas de envío · ${store.name}`,
};

export default function PoliticasEnvio() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 md:py-24">
      <h1 className="font-script text-5xl text-accent mb-8 text-center">
        Políticas de envío
      </h1>
      <div className="space-y-6 text-muted leading-relaxed text-sm">
        <div>
          <h2 className="text-foreground font-medium mb-1">Cobertura</h2>
          <p>
            Realizamos delivery a todo Lima Metropolitana. Para envíos a
            provincias coordinamos por agencia de transporte.
          </p>
        </div>
        <div>
          <h2 className="text-foreground font-medium mb-1">Tiempos de entrega</h2>
          <p>
            Los pedidos en Lima se entregan normalmente en 24 a 72 horas hábiles
            luego de confirmado el pago. Para provincias, el tiempo depende de la
            agencia elegida.
          </p>
        </div>
        <div>
          <h2 className="text-foreground font-medium mb-1">Costo de envío</h2>
          <p>
            El costo se calcula según la zona de entrega y se coordina al momento
            de confirmar tu pedido.
          </p>
        </div>
        <div>
          <h2 className="text-foreground font-medium mb-1">Cambios</h2>
          <p>
            Aceptamos cambios hasta 7 días después de la compra, siempre que la
            prenda esté en perfecto estado, sin uso y con su etiqueta.
          </p>
        </div>
        <p>
          Si tienes dudas, escríbenos por WhatsApp al{" "}
          <a
            href={`https://wa.me/${store.whatsapp}`}
            target="_blank"
            className="text-accent hover:underline"
          >
            +{store.whatsapp}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
