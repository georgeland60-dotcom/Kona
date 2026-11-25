# Pasar la tienda a konamoda.pe

Guía para el día del cambio. Está escrita en orden: lo de arriba se hace
antes, lo de abajo después. Lo que lleva ⚠️ rompe la tienda si se olvida.

**Estado al 25 de noviembre de 2026: el cambio está hecho.** konamoda.pe
usa los servidores de nombres de Vercel, sirve la tienda con HTTPS y la
variable de §2.2 ya dice `https://konamoda.pe` (solo Production). Lo que
queda es §4 y la prueba de humo de §5. (La guía se escribió el 7 nov, con la tienda solo en
`kona-henna.vercel.app` y el hosting anterior suspendido.)

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
| `/etiqueta-producto/...`, `/product-tag/...` | `/tienda` |
| `/product/<slug>` (base en inglés, por si quedó algún enlace) | `/producto/<slug>` |
| `/carrito`, `/finalizar-compra`, `/mi-cuenta`, `/shop` | `/tienda` |

---

## 2. Antes de tocar el dominio

### 2.1 ✅ El número de WhatsApp

**Resuelto el 8 nov 2026:** `51942187981` (+51 942 187 981), el que usaba
el botón de la tienda vieja, confirmado. Está como valor por defecto en
`src/config/store.ts`, así que sirve en producción, en pruebas y en
local sin poner ninguna variable.

Si algún día cambia: o se edita ahí, o se pone en Vercel
`NEXT_PUBLIC_WHATSAPP` (51 + número, sin + ni espacios), que manda sobre
el del código. En los dos casos **hay que volver a desplegar**: se
incrusta al construir, no se lee en caliente.

### 2.2 ⚠️ La dirección del sitio

```
NEXT_PUBLIC_SITE_URL = https://konamoda.pe        (solo Production)
```

De ahí salen tres cosas que no se pueden quedar apuntando a Vercel:
a dónde vuelve la clienta después de pagar, a dónde avisa Mercado Pago
que el pago entró, y la dirección canónica que lee Google. También hay
que desplegar después de ponerla.

**La variable ya existe** (Production y Preview) y hoy anuncia
`kona-henna.vercel.app`. **Se cambia DESPUÉS de que el DNS apunte a
Vercel, no antes**: si se cambia antes, Google y Mercado Pago reciben una
dirección que todavía lleva a la página muerta del hosting viejo.

### 2.3 El resto de variables

| Variable | Para qué | ¿Sin ella? |
|---|---|---|
| `ADMIN_PASSWORD` | entrar al panel | no se puede entrar |
| `ADMIN_SESSION_SECRET` | firmar la sesión del panel | se usa una por defecto: ponla |
| `UPSTASH_REDIS_REST_URL` / `..._TOKEN` | la base de datos | los cambios no se guardan |
| `MERCADOPAGO_ACCESS_TOKEN` | cobrar con tarjeta/Yape | el botón de pagar falla |
| `MERCADOPAGO_WEBHOOK_SECRET` | confirmar pagos solos | los pagos no se marcan |
| `OPENROUTER_API_KEY` | Kona Assistant y el bot | no responden |
| `GEMINI_API_KEY` | respaldo de la IA (opcional) | si OpenRouter falla, no hay plan B |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_ALLOWED_CHAT_IDS` | el bot de la dueña | no escucha |
| `NEXT_PUBLIC_INSTAGRAM`, `NEXT_PUBLIC_FACEBOOK` | enlaces del pie | enlaces genéricos |

### 2.3-bis Medición: GA4 y Pixel de Meta

El código ya está puesto (`src/components/Medicion.tsx`,
`src/lib/medicion.ts`). Se enciende solo cuando estas variables existen
en **Production** (y después se despliega):

```
NEXT_PUBLIC_GA4_ID         = G-XXXXXXXXXX     (ID de medición de GA4)
NEXT_PUBLIC_META_PIXEL_ID  = el número del Pixel
```

No son claves: salen en el código de cada página. Lo que mide, en los
dos a la vez: visitas, **añadir al carrito**, **empezar a pagar** (con el
método) y **compra** (solo pagos aprobados de Mercado Pago, una vez por
pedido aunque se recargue la página de "¡Gracias!"). Las copias de
pruebas no miden nada.

- **GA4:** hay que crear una propiedad nueva. La tienda vieja usaba
  Universal Analytics (`UA-…`), que Google apagó: no se puede reutilizar.
- **Pixel:** la tienda vieja usaba uno (el número está en
  `DOMINIO_Y_HOSTING.md`). Antes de reutilizarlo, **confirmar que está
  en la cuenta de Meta de la dueña** y no en la de la agencia que hizo
  la web vieja: el Pixel manda los datos de las visitas a quien sea su
  dueño.

### 2.4 Los datos de la tienda

- **Cómo te pagan** (`/admin/pagos`): número de Yape, de Plin y la cuenta
  del banco. Está vacío. Mientras lo esté, a quien elija pagar por
  transferencia se le dice que se los pasas por WhatsApp.
- **Inventario** (`/admin/inventario`): botón "Traer ese inventario" si
  la base ya tiene datos guardados. Deja las 369 unidades reales del
  backup. Si la tienda arranca de cero, ya vienen puestas.

---

## 3. El cambio de dominio

**✅ Hecho (25 de noviembre de 2026)** por el camino recomendado: en NIC.PE
los servidores de nombres pasaron a `ns1/ns2.vercel-dns.com`. Ojo para
otra vez: el registro cambió antes que Vercel, y durante unas horas los
servidores de Vercel rechazaban las consultas porque Vercel no había
creado la zona; se destrabó al abrir el dominio en el panel de Vercel
(Domains → konamoda.pe). `www.konamoda.pe` redirige a `konamoda.pe` con
un 308. El correo se dejó para después (abajo).

Datos completos (whois, zona DNS, hosting, correo) en
`DOMINIO_Y_HOSTING.md`, que **no está en el repo** porque tiene datos
personales de la titular. Lo que importa para decidir:

### Quién manda sobre qué

| | Quién | Qué se cambia ahí |
|---|---|---|
| **El dominio** | **NIC.PE directo** (punto.pe), sin intermediario. Titular: la dueña. Estado `ok`. | **Los servidores de nombres.** Se entra con el correo del contacto administrativo del dominio (en `DOMINIO_Y_HOSTING.md`). |
| La zona DNS actual | Hosting **Private Systems**, revendido por **BGMax** (agencia de marketing), con servidores de marca `ns1/ns2.bgmaxperu.com` | Los registros sueltos. Está **suspendido desde el 24 oct 2026**: no se puede entrar al cPanel sin regularizarlo. |

**El dominio es de la dueña**, no de la agencia. No hace falta pedirle
nada a BGMax para cambiar los servidores de nombres: se hace en NIC.PE.
**Vence el 23 de octubre de 2027** (registrado el 24 oct 2020); se renueva desde el panel de NIC.PE, botón "Renovar".

### ⚠️ Hay correo: `pedidos@konamoda.pe`

Un buzón real (101 MB, copia en el backup), con su `MX` apuntando al
hosting suspendido. Lo más probable es que **ya no funcione desde el 24
de octubre**, pero hay que confirmarlo, y hay que decidir antes de mover
el DNS:

- **Dejarlo morir.** La tienda nueva no manda ni recibe correo (todo va
  por WhatsApp y Telegram). Revisar antes que ninguna cuenta importante
  (Mercado Pago, Meta, Google) use `pedidos@` para recuperar la
  contraseña: si lo usa, perderlo es perder esa cuenta.
- **Reenviarlo a un Gmail** con un servicio de reenvío gratis: se crean
  sus `MX` en Vercel y lo que llegue a `pedidos@` cae en el Gmail.
- **Un buzón de verdad** (Zoho, Google Workspace…): más completo, y
  Workspace es de pago.

### Camino recomendado: servidores de nombres a Vercel

En el panel de NIC.PE, cambiar los servidores de nombres de
`ns1/ns2.bgmaxperu.com` a:

```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

Vercel pone solo los registros de la web (el dominio ya está en el
proyecto). El correo **no**: si se decide mantenerlo, sus `MX` (y un SPF
nuevo) se crean en Vercel **antes** de cambiar los servidores de nombres.
Así el DNS deja de depender de un hosting suspendido que BGMax puede
borrar en cualquier momento.

### Alternativa: cambiar registros en la zona actual

Solo si se reactiva el cPanel (o BGMax lo hace por ella):

| Tipo | Nombre | Valor | Qué hacer |
|---|---|---|---|
| `A` | `konamoda.pe` | `76.76.21.21` | **cambiar** el `108.160.156.250` |
| `AAAA` | `konamoda.pe` | — | **borrar** (`2600:4c00:512:4cc5::235`): si queda, quien entre por IPv6 sigue llegando al hosting muerto |
| `CNAME` | `www` | `cname.vercel-dns.com` | **cambiar** (hoy apunta a `konamoda.pe`) |

Los `MX`, `mail`, SPF y DKIM se quedan como están en este camino.

### Después, en los dos casos

1. El certificado HTTPS lo emite Vercel solo cuando ve el DNS bien.
   Minutos, u horas si el TTL viejo (4 h) todavía no venció.
2. Cuando Vercel marque los dos dominios en verde: §2.2 (la variable) y
   desplegar.

---

## 4. Después del cambio

1. **Mercado Pago** → Tus integraciones → Webhooks: poner
   `https://konamoda.pe/api/pagos/mercadopago` (modo productivo, evento
   Pagos) y copiar la clave secreta a `MERCADOPAGO_WEBHOOK_SECRET` (solo
   Production, Sensitive; la pone la persona). **No es lo que hace que
   los pedidos se marquen pagados:** cada cobro ya lleva su propia
   dirección de aviso (`notification_url`, sale de
   `NEXT_PUBLIC_SITE_URL`) y el webhook confirma cada pago preguntándole
   a Mercado Pago. La clave suma la comprobación de firma, para que la
   tienda descarte avisos que no vienen de Mercado Pago.
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

## 6. La IA

Desde noviembre de 2026 la tienda habla con los modelos a través de
**OpenRouter**, no con Google directo. Con una sola clave llega a
modelos de varios fabricantes, así que cuando uno está saturado la misma
pregunta sale por otro; hablando con Google directo, una tarde mala
dejaba al asistente mudo delante de las clientas.

Qué hay que hacer una vez:

1. Crear la cuenta en <https://openrouter.ai> (con Google es lo más
   rápido) y la clave en **Settings → Keys → Create Key**. Se muestra
   una sola vez y empieza con `sk-or-v1-`.
2. Ponerla en Vercel como `OPENROUTER_API_KEY` (Production). Nunca en el
   código: con esa clave cualquiera gasta la cuota.
3. Opcional: ponerle un **Credit limit** en OpenRouter para que no pueda
   gastar más de cierto valor aunque algo se desmadre.

Lo que conviene saber:

- Los modelos que terminan en `:free` no cuestan nada. La cuenta gratis
  da **50 consultas al día**; comprando 10 dólares de créditos una vez
  sube a **1000 al día**. El contador se reinicia a medianoche UTC, que
  son las **7 de la tarde en Perú**.
- La tienda **no tiene ningún modelo escrito a mano**: pregunta cada día
  qué modelos gratis hay, se queda con los que aceptan herramientas (el
  bot las necesita), deja los muy pequeños para el final de la fila y
  prueba hasta cinco antes de rendirse. Si hiciera falta fijar uno, va
  en `OPENROUTER_MODELOS`.
- **Comprobado el 8 de noviembre de 2026** desde el propio servidor: la
  clave contesta, la lista trae 464 modelos (12 gratis con
  herramientas) y una consulta real llegó a destino. Ese día los dos
  primeros de la fila devolvieron 429 ("saturado arriba"), que es
  justo lo normal en los gratis y la razón de que haya cadena.
- Si además queda puesta `GEMINI_API_KEY`, se usa de respaldo cuando
  OpenRouter falla por algo que no sea la clave.
- Para ver si está bien conectado:
  `…/api/agent/setup?clave=EL_SECRETO&probar=1` responde con el modelo
  que contestó y cuánta cuota queda. Y `&modelos=1` lista los
  candidatos de hoy.

## 7. Lo que queda decidido a medias

- **Correo `pedidos@konamoda.pe` — PARA DESPUÉS** (decidido el 8 nov:
  se migra el dominio sin tocarlo). Al pasar los servidores de nombres a
  Vercel deja de llegar; con el hosting suspendido desde el 24 oct lo más
  probable es que ya no llegara. Opciones cuando se retome: dejarlo
  morir, reenviarlo a un Gmail o un buzón de verdad (§3). El buzón viejo
  (101 MB) está en el backup. **Revisar** que ninguna cuenta importante
  (Mercado Pago, Meta, Google) lo use para recuperar la contraseña.
- **Crédito de OpenRouter — PENDIENTE DE DECIDIR.** Con la cuenta gratis
  la IA tiene 50 consultas al día entre el bot de la dueña y la asistente
  de la tienda; un día bueno de ventas se las come y se queda muda hasta
  las 7 de la tarde. **Son 10 USD, una sola vez, no mensuales** (se habló
  de "100 USD": la cifra que hace falta es 10). Con eso sube a 1000 al
  día y se abren modelos mejores a céntimos por consulta. Ver §6.

- **Plan de Vercel.** Se arranca en el gratuito, decidido el 8 de
  noviembre. Queda dicho para que no sorprenda: sus condiciones reservan
  el plan Hobby al uso personal o no comercial y piden Pro para lo
  comercial, así que el riesgo que se asume es que suspendan el proyecto
  sin aviso. Revisar cuando haya ventas que justifiquen los 20 USD.
- **Colores.** Los 4 pantalones dril y los 3 de maquillaje se vendían por
  color en WooCommerce; aquí son un producto con el stock sumado. Quien
  pide "Sami talla 30" no elige color.
- **Cupones.** WooCommerce tenía 30 publicados. Aquí los descuentos se
  aplican solos, no hay código que la clienta escriba.
- **Los 7 productos sin una sola unidad** se siguen mostrando, agotados.
  Si prefieres esconderlos, se ocultan desde `/admin/productos`.

---

## 8. El sitio de pruebas

Lo que se quiere: **konamoda.pe es la tienda**, y queda otra copia para
probar cosas sin tocar la de verdad.

Lo que hay que saber, porque no es lo que parece:

- **`kona-henna.vercel.app` NO va a ser un sitio de pruebas.** Vercel
  sirve el MISMO despliegue de producción en todos los dominios del
  proyecto. Cuando konamoda.pe esté activo, kona-henna será la misma
  tienda con otra dirección: los mismos productos, los mismos pedidos,
  el mismo stock. No hace daño (Google ve que la dirección buena es
  konamoda.pe), pero probar algo ahí es probarlo en la tienda real.
- **El sitio de pruebas de verdad es una rama.** Cada rama que se sube a
  GitHub tiene su propia dirección en Vercel, que no se indexa en Google
  (`robots.txt` la cierra sola). Una rama `pruebas` da una dirección
  fija: `kona-git-pruebas-ai-agenda-s-projects.vercel.app`.

### ✅ Las ramas de pruebas ya no tocan la tienda real

**Hecho el 18 nov 2026:** las variables de la base de datos
(`KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`,
`KV_REST_API_READ_ONLY_TOKEN`, `KV_REDIS_URL`) y las del bot
(`TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`,
`TELEGRAM_ALLOWED_CHAT_IDS`) están **solo en Production**.

Lo que eso significa para una copia de pruebas:

- Arranca con los datos de fábrica, que ya traen el inventario real.
- **No guarda nada**: lo que se cambie en su panel se pierde al
  recargar. Sirve para ver diseño, textos, carrito, flujo de pago. No
  sirve para probar el panel guardando cosas.
- No puede contestar como el bot de la dueña.

Si algún día hace falta probar guardando, la salida es una base de datos
aparte (otra Upstash gratis) conectada **solo** a Preview. Nunca volver
a marcar Preview en las `KV_*` de producción.

Ojo: esto vale para los despliegues de prueba **nuevos**. Uno creado
antes del 18 nov conserva las variables con las que nació.

### Seguridad, al pasar a producción

`ADMIN_PASSWORD` está marcada en Vercel como "clave temporal: cambiar por
una larga antes de dar la web a clientas", y Vercel la señala como
legible (`readable-secret`), igual que `ADMIN_SESSION_SECRET`. Con el
dominio real es el momento: crearlas de nuevo como **Sensitive** y con
una clave larga.
