import Link from "next/link";
import Image from "next/image";
import { store } from "@/config/store";

export default function Footer() {
  return (
    <footer className="mt-20 bg-k-fucsia text-white">
      <div className="max-w-6xl mx-auto px-4 py-12 grid gap-10 md:grid-cols-3">
        <div>
          {/* El logo del pie usa el MISMO archivo que la cabecera.
              Antes usaba logo-foot.png, que es un PNG sin canal alfa:
              un rectangulo fucsia macizo con el logo en blanco dentro.
              Al aplicarle brightness-0 invert (que es lo que lo pone
              blanco) se volvia blanco el rectangulo ENTERO, y en el pie
              se veia un recuadro blanco en vez del logo.
              logo-kona.webp si tiene transparencia, asi que al pasarlo
              a blanco solo se pone blanco el trazo. */}
          <Image
            src="/logo-kona.webp"
            alt={store.name}
            width={258}
            height={230}
            className="h-20 w-auto mb-4 brightness-0 invert"
          />
          <p className="text-sm text-white/85 leading-relaxed">
            {store.tagline}. Envíos a todo Lima. Pago seguro. Cambios hasta 7
            días después de la compra.
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
            Síguenos
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

      {/* El pb de mas en celular es para el globo flotante del Kona
          Assistant: va fijo abajo a la derecha y, sin este hueco, se
          sienta justo encima de esta linea y la tapa. */}
      <div className="border-t border-white/25 pt-5 pb-24 md:pb-5 text-center text-xs text-white/75">
        © {new Date().getFullYear()} {store.name}. Todos los derechos reservados.
      </div>
    </footer>
  );
}
