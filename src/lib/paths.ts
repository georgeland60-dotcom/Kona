// =============================================================
//  RUTAS DE DATOS (base de datos y fotos subidas)
//  En local se usan carpetas dentro del proyecto (data/).
//  En producción (Render) se apunta al DISCO PERSISTENTE mediante
//  variables de entorno, para que nada se borre al actualizar:
//    KONA_DATA_DIR=/var/kona          (carpeta del disco persistente)
//  De ahí se derivan la base de datos y la carpeta de fotos subidas.
//  Se pueden sobreescribir individualmente con KONA_DB_PATH y
//  KONA_UPLOADS_DIR si hiciera falta.
// =============================================================

import path from "path";

export const DATA_DIR =
  process.env.KONA_DATA_DIR || path.join(process.cwd(), "data");

// Archivo único de la base de datos SQLite.
export const DB_PATH =
  process.env.KONA_DB_PATH || path.join(DATA_DIR, "kona.db");

// Carpeta donde se guardan las fotos subidas desde el panel. NO va dentro
// de /public para que el disco persistente no exponga la base de datos;
// las fotos se sirven mediante la ruta /media/<archivo> (ver app/media).
export const UPLOADS_DIR =
  process.env.KONA_UPLOADS_DIR || path.join(DATA_DIR, "uploads");
