import Image from "next/image";

// =============================================================
//  FOTO
//  Envuelve next/image para que todas las fotos de la portada se
//  sirvan bien y no haya que repetir la misma configuracion.
//
//  Por que importa: una foto estirada mas alla de su tamano real se
//  ve pixelada, y es exactamente lo que pasaba antes (una foto de
//  1015 px puesta a lo ancho de una pantalla de 2880). Con "sizes"
//  le decimos al navegador cuanto espacio va a ocupar de verdad, y
//  Next sirve la medida justa en vez de la mas grande.
//
//  Regla para no repetir el error: el ancho en pantalla NUNCA deberia
//  pasar el ancho real del archivo. Las fotos de marca que tenemos
//  miden entre 835 y 1015 px, por eso las columnas donde viven estan
//  limitadas a unos 620 px.
// =============================================================

export default function Foto({
  src,
  alt,
  sizes,
  priority = false,
  className = "",
  position = "object-center",
}: {
  src: string;
  alt: string;
  /** Cuanto espacio ocupa en pantalla, ej "(min-width: 768px) 50vw, 100vw" */
  sizes: string;
  priority?: boolean;
  className?: string;
  position?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      quality={88}
      className={`object-cover ${position} ${className}`}
    />
  );
}
