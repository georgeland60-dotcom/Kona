import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Next 16 cambio esto: por defecto solo acepta calidad 75 y
    // cualquier otra se degrada en silencio a la mas cercana. Como las
    // fotos de moda son lo que vende, aqui se permite tambien 88, que
    // es la que usan los componentes de marca.
    qualities: [75, 88],
  },
};

export default nextConfig;
