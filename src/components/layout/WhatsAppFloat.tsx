import { store } from "@/config/store";

// Botón flotante de WhatsApp: queda fijo abajo a la derecha y acompaña al
// visitante en toda la tienda. Abre el chat de WhatsApp con el número central
// configurado en src/config/store.ts (store.whatsapp) — así solo se cambia
// en UN lugar. No redirige a ningún otro número.
export default function WhatsAppFloat() {
  const mensaje = `¡Hola ${store.name}! Quiero más información 😊`;
  const href = `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(mensaje)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      title="Escríbenos por WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] shadow-lg hover:scale-105 active:scale-95 transition-transform"
    >
      {/* Ícono oficial de WhatsApp (SVG, sin librerías externas) */}
      <svg
        viewBox="0 0 32 32"
        className="w-8 h-8"
        fill="white"
        aria-hidden="true"
      >
        <path d="M16.001 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.257.59 4.462 1.71 6.406L3.2 28.8l6.57-1.723a12.74 12.74 0 006.231 1.586h.005c7.06 0 12.8-5.74 12.8-12.8 0-3.42-1.332-6.635-3.75-9.053A12.716 12.716 0 0016.001 3.2zm0 23.36h-.004a10.55 10.55 0 01-5.377-1.473l-.386-.229-3.899 1.023 1.041-3.803-.251-.39a10.53 10.53 0 01-1.615-5.615c0-5.867 4.774-10.64 10.646-10.64a10.57 10.57 0 017.523 3.12 10.57 10.57 0 013.117 7.525c0 5.867-4.773 10.64-10.646 10.64zm5.834-7.967c-.32-.16-1.892-.933-2.185-1.04-.293-.107-.507-.16-.72.16-.213.32-.826 1.04-1.013 1.253-.187.213-.373.24-.693.08-.32-.16-1.35-.498-2.572-1.587-.95-.848-1.593-1.895-1.78-2.215-.186-.32-.02-.493.14-.652.144-.143.32-.373.48-.56.16-.187.213-.32.32-.533.107-.213.053-.4-.027-.56-.08-.16-.72-1.735-.987-2.375-.26-.624-.524-.539-.72-.549l-.613-.011c-.213 0-.56.08-.853.4-.293.32-1.12 1.093-1.12 2.667 0 1.573 1.147 3.093 1.307 3.307.16.213 2.253 3.44 5.46 4.824.763.33 1.36.527 1.824.674.767.244 1.464.21 2.016.127.615-.092 1.892-.773 2.159-1.52.267-.747.267-1.387.187-1.52-.08-.133-.293-.213-.613-.373z" />
      </svg>
    </a>
  );
}
