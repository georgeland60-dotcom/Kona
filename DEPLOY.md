# Publicar Kona Moda en Render

Guía paso a paso para poner la tienda online con una URL pública y HTTPS.
Está pensada para seguirse **sin ser técnico/a**. Cualquier duda, pregúntame.

La tienda usa una base de datos SQLite (un archivo) y guarda las fotos subidas
en un **disco persistente**, así los pedidos, el stock y las fotos **no se
borran** cuando se actualiza la web.

> 💡 El plan de Render con disco persistente cuesta **~US$7/mes**. El plan
> gratis **no** permite disco persistente, por eso no sirve para vender.

---

## Parte 1 · Publicar la tienda (≈10 minutos)

1. Entra a **https://render.com** y haz **"Get Started" / "Sign in with GitHub"**
   con la cuenta `georgeland60-dotcom`.
2. En el panel de Render, clic en **"New +" → "Blueprint"**.
3. Elige el repositorio **`Kona`** y la rama que quieras publicar.
   - Render leerá el archivo `render.yaml` del proyecto y **configurará todo
     solo**: la build, el arranque y el disco persistente.
4. Render te mostrará el servicio `kona-moda` y te pedirá completar las
   **variables de entorno marcadas como "sync: false"** (ver Parte 2).
5. Pulsa **"Apply"** y espera unos minutos a que termine el primer despliegue.
6. Cuando quede en verde ("Live"), Render te dará una URL tipo
   `https://kona-moda.onrender.com`. ¡Esa es tu tienda online!

---

## Parte 2 · Variables de entorno

En Render, dentro del servicio `kona-moda` → pestaña **"Environment"**, completa:

| Nombre | Qué poner | ¿Obligatoria? |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | La URL final de la tienda, ej. `https://kona-moda.onrender.com` (o tu dominio propio). | Sí |
| `ADMIN_PASSWORD` | Una contraseña fuerte para entrar a `/admin`. | Sí (para el panel) |
| `MERCADOPAGO_ACCESS_TOKEN` | Tu Access Token de **producción** (empieza con `APP_USR-`). | Para cobrar |
| `MERCADOPAGO_WEBHOOK_SECRET` | La "firma secreta" del webhook (ver Parte 3). | Para cobrar seguro |

> `KONA_DATA_DIR`, `NODE_VERSION` y `ADMIN_SESSION_SECRET` ya vienen
> configuradas automáticamente por `render.yaml` (esta última la genera Render
> sola). No las toques.

Después de cambiar variables, Render vuelve a desplegar solo.

---

## Parte 3 · Configurar Mercado Pago (cobros seguros)

Para que los pagos se confirmen de forma segura necesitas dos cosas de tu
panel de Mercado Pago → **"Tus integraciones" → tu aplicación**:

1. **Access Token de producción** (`APP_USR-...`): cópialo en la variable
   `MERCADOPAGO_ACCESS_TOKEN`.
2. **Webhook / Notificaciones:**
   - Agrega esta URL de notificación:
     `https://TU-DOMINIO/api/orders/webhook`
     (reemplaza `TU-DOMINIO` por tu URL real).
   - Selecciona el evento **"Pagos" (payment)**.
   - Mercado Pago te dará una **"Firma secreta"**: cópiala en la variable
     `MERCADOPAGO_WEBHOOK_SECRET`.

Con esto, la tienda verifica cada pago directamente con Mercado Pago (nadie
puede marcar un pedido como pagado sin haber pagado de verdad).

> Para **probar** antes de cobrar de verdad, puedes usar las credenciales de
> **prueba** (`TEST-...`) de Mercado Pago con tarjetas de prueba.

---

## Parte 4 · Tu dominio propio + HTTPS (opcional)

1. En Render, servicio `kona-moda` → **"Settings" → "Custom Domains" → "Add
   Custom Domain"**. Escribe tu dominio, ej. `konamoda.pe` (y `www.konamoda.pe`).
2. Render te mostrará unos registros DNS (tipo `A` / `CNAME`). Entra donde
   compraste el dominio y **crea esos registros** tal cual.
3. Espera a que Render verifique el dominio (puede tardar un rato). El
   **HTTPS (candado 🔒) se activa solo y gratis**.
4. Cambia `NEXT_PUBLIC_SITE_URL` a tu dominio final y actualiza también la URL
   del webhook en Mercado Pago.

---

## Parte 5 · Copias de seguridad (¡importante!)

Aunque el disco de Render es confiable, **siempre** conviene tener copias
propias de los datos (pedidos, stock, precios).

- **Copia con un clic:** entra al panel `/admin` y usa el botón
  **"⬇︎ Copia de seguridad"** (o visita `/api/admin/backup`). Descarga un
  archivo `kona-backup-FECHA.db` con toda la tienda. Guárdalo en tu compu o
  en la nube (Drive, etc.) cada cierto tiempo.
- Ese archivo `.db` se puede abrir con cualquier visor de SQLite y sirve para
  restaurar si algún día hiciera falta.

> Recomendación: descarga una copia al menos una vez por semana, y siempre
> antes de un cambio grande.

---

## Actualizar la tienda

Cada vez que se haga `git push` a la rama publicada, Render **reconstruye y
publica los cambios automáticamente**. Los pedidos, el stock y las fotos
subidas se conservan (están en el disco persistente).

---

## Resumen de lo que ya quedó resuelto en el código

- **Base de datos SQLite** en el disco persistente (no se pierde nada).
- **Pagos blindados**: verificación servidor-a-servidor + webhook con firma.
- **Fotos subidas** guardadas en el disco y servidas por `/media/...`.
- **Dashboard** con datos al día, filtros por fecha y auto-actualización.
- **Backups** descargables desde el panel.
