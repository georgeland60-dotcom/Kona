# Desplegar Kona Moda en Vercel

Guía rápida para poner la web online con una URL pública (ej. `https://kona-moda.vercel.app`).
La build de producción ya está verificada (`npm run build` compila sin errores).

## Pasos (≈2 minutos)

1. Entra a **https://vercel.com** y haz **"Sign Up" / "Log in" con GitHub**
   (la cuenta `georgeland60-dotcom`).
2. Clic en **"Add New…" → "Project"**.
3. En la lista de repos, busca **`Kona`** y pulsa **"Import"**.
4. En **"Configure Project"**:
   - **Framework Preset:** Next.js (se detecta solo).
   - **Branch a desplegar:** cambia a `claude/web-v2-latest-nt1n9p`
     (o despliega `main` si prefieres; la página vive en la ruta `/v2`).
   - Despliega **Environment Variables** y agrega las de abajo.
5. Pulsa **"Deploy"** y espera ~1 minuto.
6. Abre la URL que te da Vercel y añade `/v2` al final para ver el diseño v2.
   Ejemplo: `https://kona-moda.vercel.app/v2`

## Variables de entorno (Environment Variables)

| Nombre | Valor | ¿Obligatoria? |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | la URL que te da Vercel, ej. `https://kona-moda.vercel.app` | Sí |
| `ADMIN_PASSWORD` | una contraseña fuerte para `/admin` | Solo si usas el panel |
| `ADMIN_SESSION_SECRET` | cadena aleatoria larga (ver abajo) | Solo si usas el panel |
| `MERCADOPAGO_ACCESS_TOKEN` | tu token de Mercado Pago (`TEST-…` o `APP_USR-…`) | Solo para cobrar |

Para generar `ADMIN_SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> La tienda y el diseño `/v2` se ven sin necesidad de Mercado Pago. El token solo
> hace falta cuando un cliente intenta pagar.

## Actualizaciones

Cada vez que se haga `git push` a la rama desplegada, Vercel reconstruye y
publica los cambios automáticamente.
