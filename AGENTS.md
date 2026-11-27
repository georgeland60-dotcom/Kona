<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Kona Moda — contexto del proyecto

Tienda de ropa de mujer de Lima. Next.js 16 en Vercel, datos en Upstash
(KV), pagos con Mercado Pago y por transferencia/Yape/Plin gestionados
por WhatsApp, bot de la dueña en Telegram y una asistente pública en la
tienda. La IA entra por OpenRouter (modelos gratis) con Gemini de
respaldo.

## Dónde vive cada cosa

| | Dirección | Qué es |
|---|---|---|
| **Producción** | **https://konamoda.pe** | La tienda de verdad (activa desde el 25 nov 2026). `www` redirige aquí. |
| Mismo despliegue | https://kona-henna.vercel.app | La MISMA tienda con otra dirección. No es de pruebas. |
| Pruebas | rama `pruebas` → `kona-git-pruebas-ai-agenda-s-projects.vercel.app` | Copia para probar. Ver MIGRACION.md §8 antes de usarla. |

**Para cualquier agente que trabaje en la tienda:** la dirección oficial
es **https://konamoda.pe** (anuncios, Instagram, reels, enlaces que se
compartan). Lo que se publica sale de la rama **`main`**: todo cambio
tiene que terminar ahí para verse en la tienda. La rama de pruebas
`claude/web-v2-latest-nt1n9p` quedó atrasada el 22 nov 2026 (sus
cambios visuales ya están en `main`); no partir de ella.

**Estado de la migración: CERRADA (25 nov 2026).** En NIC.PE los
servidores de nombres pasaron a `ns1/ns2.vercel-dns.com`; Vercel tomó la
zona el 25 nov y konamoda.pe sirve la tienda (www redirige al dominio
sin www), con HTTPS. `NEXT_PUBLIC_SITE_URL=https://konamoda.pe` solo
en Production.
kona-henna.vercel.app sigue funcionando como la misma tienda. El correo
`pedidos@konamoda.pe` dejó de llegar con el cambio (decidido: para
después). Detalle en MIGRACION.md §3.

## Pendientes (al 8 nov 2026)

Lo que falta, para que nadie lo dé por hecho. Detalle en MIGRACION.md §7.

1. ✅ **DNS de konamoda.pe** (25 nov 2026): servidores de nombres en
   Vercel, HTTPS, `NEXT_PUBLIC_SITE_URL` puesta y desplegado. Sigue
   MIGRACION.md §4 (webhook de Mercado Pago, Search Console).
2. **Correo `pedidos@konamoda.pe`** — para después. Deja de llegar con el
   cambio de DNS; revisar que ninguna cuenta lo use para recuperar
   contraseña.
3. **Crédito de OpenRouter** — 10 USD una vez (no mensual): de 50 a 1000
   consultas de IA al día. Por decidir.
4. ✅ **Datos de pago** (27 nov 2026): Yape/Plin y cuatro cuentas
   (Interbank, BCP, BBVA, Scotiabank) cargados con la variable
   `DATOS_PAGO_INICIALES` de Vercel (Production), que se aplica una sola
   vez cuando no hay datos guardados; desde ahí se editan en
   `/admin/pagos`. Los números NO van en el código (repo público).
   Regla activa: a provincia solo tarjeta o Yape/Plin, sin
   transferencia.
5. **Contraseña del panel** — `ADMIN_PASSWORD` es temporal; cambiarla
   por una larga y crearla como Sensitive (la pone la persona).
6. ✅ **Sitio de pruebas separado** (18 nov 2026): `KV_*` y `TELEGRAM_*`
   solo en Production. Una rama de pruebas no guarda nada ni habla como
   el bot (MIGRACION.md §8).
7. ✅ **Webhook de Mercado Pago** (26 nov 2026): en el panel de
   desarrolladores, Webhooks → Modo productivo →
   `https://konamoda.pe/api/pagos/mercadopago`, evento "Pagos (legacy)"
   (es el aviso de pagos; "legacy" solo porque Mercado Pago tiene otro
   sistema de órdenes que la tienda no usa). Simulación: 200.
   `MERCADOPAGO_WEBHOOK_SECRET` puesta por la persona, solo Production.
8. ✅ **Vencimiento del dominio: 23 de octubre de 2027** (visto en el
   panel de NIC.PE el 18 nov 2026). Renovar antes desde ese panel.
   Registrado el 24 oct 2020.
9. **GA4 y Pixel de Meta** — el código ya está; falta poner
   `NEXT_PUBLIC_GA4_ID` (propiedad GA4 nueva) y
   `NEXT_PUBLIC_META_PIXEL_ID` en Production y desplegar. Antes de usar
   el Pixel viejo, confirmar que es de la cuenta de Meta de la dueña
   (MIGRACION.md §2.3-bis).

10. **Mapa de direcciones** (27 nov 2026): hoy busca en OpenStreetMap,
   que no tiene muchas calles de Lima (ni el Jr. Los Brigadieres de la
   tienda). Ya se arregló lo que no necesita clave: nombres de distrito
   ("Surco" → "Santiago de Surco"), preferir resultados del distrito
   elegido y no decir "exacta" cuando solo halló la calle. Para que
   encuentre casi todo falta `GOOGLE_MAPS_API_KEY` (Places API, la pone
   la persona en Production como Sensitive). Por decidir.

## Reglas que no se negocian

- **El repositorio es PÚBLICO.** Ninguna clave, token ni contraseña en
  el código, en los commits ni en los documentos. Van en las variables
  de entorno de Vercel, y las pone la persona, no el asistente.
- **Las variables `KV_*` y `TELEGRAM_*` van SOLO en Production.**
  Marcarlas también en Preview hace que cualquier rama de pruebas
  escriba en la tienda real (MIGRACION.md §8).
- El inventario real viene del backup de WooCommerce
  (`src/data/inventario-real.ts`, corte 1 nov 2026, 369 unidades). Se
  aplica solo una vez; no reintroducir stock inventado.

## Documentos que leer antes de tocar algo

- `MIGRACION.md` — el paso a producción, las variables, el DNS, la IA,
  el sitio de pruebas y lo que queda pendiente de decidir (§7).
- `AGENTE.md` — el bot de Telegram de la dueña.
- `DOMINIO_Y_HOSTING.md` — whois, zona DNS y correo del dominio. **No
  está en el repo** (datos personales); pedírselo a quien lleve el
  proyecto. No subirlo nunca.
