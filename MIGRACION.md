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

### 2.4 Los datos de la tienda

- **Cómo te pagan** (`/admin/pagos`): número de Yape, de Plin y la cuenta
  del banco. Está vacío. Mientras lo esté, a quien elija pagar por
  transferencia se le dice que se los pasas por WhatsApp.
- **Inventario** (`/admin/inventario`): botón "Traer ese inventario" si
  la base ya tiene datos guardados. Deja las 369 unidades reales del
  backup. Si la tienda arranca de cero, ya vienen puestas.

---

## 3. El cambio de dominio

**Estado al 8 de noviembre de 2026:** los dos dominios ya están añadidos
en Vercel (proyecto `kona`); `www.konamoda.pe` redirige a `konamoda.pe`
con un 308. Falta **solo el DNS**, que no se puede tocar desde aquí.

Lo que se encontró al mirar:

- El DNS de konamoda.pe lo administra **BGMax Perú**
  (`ns1.bgmaxperu.com`, `ns2.bgmaxperu.com`). Ahí es donde se cambia.
- Hoy `konamoda.pe` apunta a `108.160.156.250`, el hosting viejo, que ya
  **no sirve la tienda**: responde una página de aparcamiento ("302
  Found", 771 bytes). No hay nada vivo que se pueda caer con el cambio.
- `www.konamoda.pe` **no existe** todavía (no tiene ningún registro).
- No hay registros MX: no se vio correo en el dominio.
- **La cuenta de hosting de BGMax está SUSPENDIDA** (`/cpanel` lleva a
  la página "Account Suspended" de cPanel). Con la cuenta suspendida lo
  normal es que no se pueda entrar al editor de zona DNS del cPanel. Y
  hay un riesgo peor: si BGMax borra la cuenta suspendida, la zona DNS
  se va con ella y konamoda.pe deja de existir en internet.

**Por eso la recomendación es sacar el DNS de BGMax**: cambiar los
servidores de nombres del dominio a los de Vercel (`ns1.vercel-dns.com`,
`ns2.vercel-dns.com`). Como el dominio ya está en el proyecto, Vercel
pone solo los registros correctos, y a partir de ahí el DNS se maneja
desde Vercel sin depender de un hosting que ya no se paga. Eso se cambia
donde esté **registrado** el dominio (si BGMax lo registró, en su área de
clientes → el dominio → "Servidores de nombres"; si no, en el
registrador que figure en el whois de punto.pe). Revisar de paso **la
fecha de vencimiento del dominio**: si está ligado a la cuenta
suspendida, puede no renovarse.

Si se prefiere dejar el DNS en BGMax (o pedírselo a su soporte), estos
son los dos registros:

| Tipo | Nombre | Valor | Qué hacer |
|---|---|---|---|
| `A` | `konamoda.pe` (o `@`) | `76.76.21.21` | **cambiar** el `108.160.156.250` por este |
| `CNAME` | `www` | `cname.vercel-dns.com` | **crear**, no existe |

1. Si hay **más de un `A`** para el dominio raíz, se dejan solo el de
   Vercel. Con dos, la mitad de las visitas sigue llegando al hosting
   muerto.
2. El certificado HTTPS lo emite Vercel solo cuando ve el DNS bien.
   Suele tardar minutos; puede tardar horas si el TTL viejo era largo.
3. Cuando Vercel marque los dos dominios en verde: §2.2 (la variable)
   y desplegar.

> **Si resulta que sí hay correo** (@konamoda.pe), **no toques los
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

- **Número de WhatsApp — PREGUNTAR.** Sigue el de ejemplo
  (`51987654321`). Es lo que más ventas pierde de esta lista: quien elige
  Yape o transferencia termina escribiendo a un número que no existe.
  Ver §2.1.
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

### ⚠️ Antes de usar una rama para probar

Hoy las variables de la base de datos (`KV_URL`, `KV_REST_API_URL`,
`KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`, `KV_REDIS_URL`)
están puestas **también en Preview**. Eso quiere decir que **cualquier
rama de pruebas escribe en la base de datos de la tienda real**: un
producto que se borre probando se borra en konamoda.pe, un stock que se
ajuste probando se vende mal mañana.

Dos salidas, de más simple a más completa:

1. **Quitar las variables `KV_*` de Preview** (Vercel → Settings →
   Environment Variables, desmarcar Preview en cada una). La copia de
   pruebas arranca con los datos de fábrica — que ya traen el inventario
   real — y no guarda nada. Sirve para ver diseño, textos, el carrito,
   el flujo de pago. No sirve para probar el panel guardando cosas.
2. **Una base de datos aparte para pruebas** (otra base Upstash gratis,
   conectada solo a Preview). Así la copia de pruebas sí guarda, en su
   propio cajón.

Lo mismo vale para `TELEGRAM_*`, que también están en Preview: una rama
de pruebas puede contestar como el bot de la dueña.

### Seguridad, al pasar a producción

`ADMIN_PASSWORD` está marcada en Vercel como "clave temporal: cambiar por
una larga antes de dar la web a clientas", y Vercel la señala como
legible (`readable-secret`), igual que `ADMIN_SESSION_SECRET`. Con el
dominio real es el momento: crearlas de nuevo como **Sensitive** y con
una clave larga.
