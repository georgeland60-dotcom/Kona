import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 es un módulo NATIVO: hay que dejarlo fuera del bundle
  // del servidor para que cargue su binario correctamente en producción.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
