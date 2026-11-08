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
| **Producción** | **https://konamoda.pe** | La tienda de verdad. `www` redirige aquí. |
| Mismo despliegue | https://kona-henna.vercel.app | La MISMA tienda con otra dirección. No es de pruebas. |
| Pruebas | rama `pruebas` → `kona-git-pruebas-ai-agenda-s-projects.vercel.app` | Copia para probar. Ver MIGRACION.md §8 antes de usarla. |

**Estado de la migración (actualizar al cerrarla):** dominios añadidos en
Vercel el 8 nov 2026. **Pendiente: el DNS**, y antes, decidir el correo
`pedidos@konamoda.pe` (su `MX` vive en el hosting viejo). El dominio
está en **NIC.PE** a nombre de la dueña; el camino recomendado es cambiar
ahí los servidores de nombres a `ns1/ns2.vercel-dns.com`. La zona actual
está en un hosting suspendido (Private Systems, revendido por la agencia
BGMax). Después: `NEXT_PUBLIC_SITE_URL=https://konamoda.pe` en
Production. Hasta que eso pase, konamoda.pe muestra la página de cuenta
suspendida y la tienda de verdad está en kona-henna.vercel.app.
Detalle en MIGRACION.md §3.

## Reglas que no se negocian

- **El repositorio es PÚBLICO.** Ninguna clave, token ni contraseña en
  el código, en los commits ni en los documentos. Van en las variables
  de entorno de Vercel, y las pone la persona, no el asistente.
- **Las ramas de pruebas escriben en la base real** mientras las
  variables `KV_*` sigan marcadas en Preview (MIGRACION.md §8). No
  probar en una rama nada que borre o cambie datos hasta resolver eso.
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
