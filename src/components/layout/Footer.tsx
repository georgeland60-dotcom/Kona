import Link from "next/link";
import Image from "next/image";
import { store } from "@/config/store";

export default function Footer() {
  return (
    <footer className="mt-20 bg-k-fucsia text-white">
      <div className="max-w-6xl mx-auto px-4 py-12 grid gap-10 md:grid-cols-3">
        <div>
          <Image
            src="/logo-foot.png"
            alt={store.name}
            width={258}
            height={230}
            className="h-20 w-auto mb-4 brightness-0 invert"
          />
          <p className="text-sm text-white/85 leading-relaxed">
            {store.tagline}. Envios a todo Lima. Pago seguro. Cambios hasta 7
            dias despues de la compra.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-3 uppercase tracking-wide">
            Información
          </h4>
          <ul className="space-y-2 text-sm text-white/85">
            <li>
              <Link href="/contacto" className="hover:text-white transition">
                Contáctenos
              </Link>
            </li>
            <li>
              <Link href="/cuidados" className="hover:text-white transition">
                Cuidados al lavar nuestras prendas
              </Link>
            </li>
            <li>
              <Link
                href="/politicas-de-envio"
                className="hover:text-white transition"
              >
                Políticas de envío
              </Link>
            </li>
            <li>
              <Link
                href="/libro-de-reclamaciones"
                className="hover:text-white transition"
              >
                Libro de Reclamaciones
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-3 uppercase tracking-wide">
            Siguenos
          </h4>
          <ul className="space-y-2 text-sm text-white/85">
            <li>
              <a href={store.instagram} target="_blank" className="hover:text-white">
                Instagram
              </a>
            </li>
            <li>
              <a href={store.facebook} target="_blank" className="hover:text-white">
                Facebook
              </a>
            </li>
            <li>
              <a
                href={`https://wa.me/${store.whatsapp}`}
                target="_blank"
                className="hover:text-white"
              >
                WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/25 py-5 text-center text-xs text-white/75">
        © {new Date().getFullYear()} {store.name}. Todos los derechos reservados.
      </div>
    </footer>
  );
}
