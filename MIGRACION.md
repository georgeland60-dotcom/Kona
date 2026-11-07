# Pasar la tienda a konamoda.pe

Guía para el día del cambio. Está escrita en orden: lo de arriba se hace
antes, lo de abajo después. Lo que lleva ⚠️ rompe la tienda si se olvida.

Estado al escribirla (7 de noviembre de 2026): la tienda nueva corre en
`kona-henna.vercel.app`, el dominio `konamoda.pe` **todavía no está
conectado** a Vercel (el proyecto solo tiene el dominio de Vercel), y el
hosting anterior está suspendido.

---

## 1. Lo que NO hay que hacer: las direcciones de producto

Las 84 fichas conservan la misma dirección que tenían en WordPress:

```
https://konamoda.pe/producto/paper-bag-leti-negro/   (antes)
https://konamoda.pe/producto/paper-bag-leti-negro    (ahora)
```

Se comprobó uno por uno contra el backup: **los 84 slugs coinciden**. Así
que los enlaces de Google, de Instagram y de los chats siguen llevando a
la prenda correcta sin tocar nada. La barra final sobra y se quita sola
con una redirección permanente.

Lo que sí cambió de sitio ya está redirigido en `next.config.ts`:

| De la tienda vieja | Va a |
|---|---|
| `/categoria-producto/<lo-que-sea>` | `/tienda?cat=<lo-que-sea>` |
| `/categoria-producto/set-conjuntos` | `/tienda?cat=conjuntos` |
| `/categoria-producto/ofertas` | `/tienda?cat=sale` |
| `/etiqueta-producto/...` | `/tienda` |
| `/carrito`, `/finalizar-compra`, `/mi-cuenta`, `/shop` | `/tienda` |

---

## 2. Antes de tocar el dominio

### 2.1 ⚠️ El número de WhatsApp

Ahora mismo la tienda en producción responde con **51987654321**, que es
el número de ejemplo y no existe. Cada botón de WhatsApp, cada
"coordinar por WhatsApp" y cada comprobante de pago va ahí.

En Vercel → Settings → Environment Variables (Production):

```
NEXT_PUBLIC_WHATSAPP = 51 + número, sin + ni espacios   (ej. 51987654321)
```

Es una variable `NEXT_PUBLIC_`, así que **hay que volver a desplegar**
para que tome efecto: se hornea al construir, no se lee en caliente.

### 2.2 ⚠️ La dirección del sitio

```
NEXT_PUBLIC_SITE_URL = https://konamoda.pe
```

De ahí salen tres cosas que no se pueden quedar apuntando a Vercel:
a dónde vuelve la clienta después de pagar, a dónde avisa Mercado Pago
que el pago entró, y la dirección canónica que lee Google. También hay
que desplegar después de ponerla.

### 2.3 El resto de variables

| Variable | Para qué | ¿Sin ella? |
|---|---|---|
| `ADMIN_PASSWORD` | entrar al panel | no se puede entrar |
| `ADMIN_SESSION_SECRET` | firmar la sesión del panel | se usa una por defecto: ponla |
| `UPSTASH_REDIS_REST_URL` / `..._TOKEN` | la base de datos | los cambios no se guardan |
| `MERCADOPAGO_ACCESS_TOKEN` | cobrar con tarjeta/Yape | el botón de pagar falla |
| `MERCADOPAGO_WEBHOOK_SECRET` | confirmar pagos solos | los pagos no se marcan |
| `GEMINI_API_KEY` | Kona Assistant y el bot | no responden |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_ALLOWED_CHAT_IDS` | el bot de la dueña | no escucha |
| `NEXT_PUBLIC_INSTAGRAM`, `NEXT_PUBLIC_FACEBOOK` | enlaces del pie | enlaces genéricos |

### 2.4 Los datos de la tienda

- **Cómo te pagan** (`/admin/pagos`): número de Yape, de Plin y la cuenta
  del banco. Está vacío. Mientras lo esté, a quien elija pagar por
  transferencia se le dice que se los pasas por WhatsApp.
- **Inventario** (`/admin/inventario`): botón "Traer ese inventario" si
  la base ya tiene datos guardados. Deja las 369 unidades reales del
  backup. Si la tienda arranca de cero, ya vienen puestas.

---

## 3. El cambio de dominio

1. Vercel → proyecto `kona` → Settings → Domains → **Add** `konamoda.pe`
   y también `www.konamoda.pe`.
2. Vercel muestra ahí mismo **los registros DNS exactos** (un `A` para el
   dominio raíz y un `CNAME` para `www`). Cópialos de esa pantalla: los
   valores los asigna Vercel y no son siempre los mismos.
3. Esos registros se ponen donde esté administrado el DNS de konamoda.pe
   (el registrador, o el panel del hosting anterior si el DNS sigue ahí).
   **Hay que quitar los registros viejos que apuntan al hosting
   suspendido**, o el dominio seguirá llegando a una página muerta.
4. El certificado HTTPS lo emite Vercel solo cuando el DNS ya apunta
   bien. Suele tardar minutos; puede tardar horas si el TTL anterior era
   largo.
5. Dejar `www` redirigiendo al dominio raíz (Vercel lo ofrece al añadirlo).

> **Si hay correo en ese dominio** (@konamoda.pe), **no toques los
> registros MX**. Cambiar el A y el CNAME no afecta al correo; borrar los
> MX sí lo apaga.

---

## 4. Después del cambio

1. **Mercado Pago** → Tus integraciones → Webhooks: poner
   `https://konamoda.pe/api/pagos/mercadopago` y copiar la clave secreta
   a `MERCADOPAGO_WEBHOOK_SECRET`. Sin esto los pagos entran pero el
   pedido se queda en "pendiente".
2. **Google Search Console**: añadir la propiedad del dominio y mandar
   `https://konamoda.pe/sitemap.xml` (106 direcciones, se arma solo del
   catálogo).
3. **Instagram**: cambiar el enlace del perfil si apunta al sitio viejo.

---

## 5. Prueba de humo (10 minutos, con el móvil)

- [ ] `konamoda.pe` abre la tienda nueva y con candado (HTTPS).
- [ ] Una ficha vieja de Google abre la prenda correcta.
- [ ] `konamoda.pe/categoria-producto/vestidos` cae en la tienda filtrada.
- [ ] Compartir una prenda por WhatsApp muestra foto, nombre y precio.
- [ ] Añadir al carrito, poner dirección y ver el mapa y el costo de envío.
- [ ] "Pagar ahora" muestra las dos formas de pago, con los números reales.
- [ ] Pagar S/ 1 de prueba con tarjeta y ver el pedido en `/admin/pedidos`.
- [ ] "Ya pagué, enviar comprobante" abre **tu** WhatsApp, no el de ejemplo.
- [ ] Preguntarle algo al asistente de la tienda y que responda.
- [ ] Escribirle al bot por Telegram y que conteste.

---

## 6. Lo que queda decidido a medias

- **Plan de Vercel.** El gratuito prohíbe el uso comercial en sus
  condiciones, y es una tienda que cobra: toca Pro (20 USD al mes) antes
  de anunciar el cambio.
- **Colores.** Los 4 pantalones dril y los 3 de maquillaje se vendían por
  color en WooCommerce; aquí son un producto con el stock sumado. Quien
  pide "Sami talla 30" no elige color.
- **Cupones.** WooCommerce tenía 30 publicados. Aquí los descuentos se
  aplican solos, no hay código que la clienta escriba.
- **Los 7 productos sin una sola unidad** se siguen mostrando, agotados.
  Si prefieres esconderlos, se ocultan desde `/admin/productos`.
