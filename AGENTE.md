# Agente de Telegram para Kona Moda

Un asistente de IA que recibe un mensaje o un audio por Telegram y hace los
cambios comerciales de la tienda: descuentos, precios, ofertas, alta y baja de
productos, stock y temporadas.

**Todo el uso es gratuito** (bot de Telegram + capa gratis de Google Gemini +
base de datos gratis de Upstash).

---

## Cómo se usa (lo importante)

Le escribes al bot como le hablarías a una persona, o le mandas una nota de voz:

> _"mete 20% de descuento a todos los vestidos hasta el domingo"_
>
> _"el pantalón Killa ahora cuesta 129"_
>
> _"pon el Dress Pams Malva en oferta a 89"_
>
> _"saca de la web la casaca jean, se agotó"_
>
> _"crea la temporada Verano y mete toda la ropa de baño"_

El agente responde con la lista exacta de lo que va a cambiar y dos botones:

```
Voy a hacer esto:
1. Crear descuento de 20% en la categoría "vestidos" (hasta 2026-08-23)
2. Ocultar de la tienda "Casaca Jean Love Azul"

¿Lo aplico?

        [ ✅ Confirmar ]   [ ✖️ Cancelar ]
```

**Nada cambia hasta que aprietas Confirmar.** Ese es el punto: el agente
propone, tú decides.

### Lo que el agente SÍ puede hacer

| | Ejemplo |
|---|---|
| Descuentos | crear, encender, apagar o borrar promociones (por producto, categoría o toda la tienda, con fechas) |
| Precios | cambiar el precio de lista de un producto |
| Ofertas | poner o sacar de oferta, con precio tachado, y meterlo al bloque Sale |
| Productos | dar de alta uno nuevo, ocultarlo, volver a mostrarlo, destacarlo en el inicio |
| Stock | fijar las unidades, por talla o de todas |
| Temporada | crear bloques como "Verano 2026" y meter o sacar productos |

### Lo que NO puede hacer (a propósito)

- Cambiar el diseño, los colores, los textos fijos o el menú de la página.
- Ver o tocar pedidos y datos de clientes.
- Subir fotos (Telegram no sirve para eso; las fotos van por el panel `/admin`).

No es que "se le pida que no lo haga": esas acciones **no existen** entre sus
herramientas, así que no puede hacerlas ni equivocándose.

---

## Instalación (una sola vez, ~10 minutos)

### 1. Crear el bot de Telegram

1. En Telegram, busca **@BotFather** (el que tiene el check azul) y escríbele
   `/newbot`.
2. Te pide dos cosas:
   - **Nombre**: el que se ve en el chat. Ej. `Kona Asistente`.
   - **Usuario**: tiene que ser único en todo Telegram y **terminar en `bot`**.
     Ej. `kona_moda_bot`. Si está ocupado, prueba otro.
3. Te va a dar un **token** tipo `8123456789:AAF...`. Guárdalo → es
   `TELEGRAM_BOT_TOKEN`.

> ⚠️ Ese token es como la contraseña del bot: quien lo tenga puede controlarlo.
> No lo mandes por chat ni lo subas a GitHub.

**Si vas a usarlo en grupo, falta un paso obligatorio.** Sigue en BotFather:

4. Escribe `/setprivacy`.
5. Elige tu bot.
6. Elige **Disable**.

Sin esto, Telegram le esconde al bot los mensajes normales del grupo: solo
vería los que empiezan con `/`. Es decir, **las notas de voz nunca le
llegarían** y parecería que el bot está roto. Ver "Modo privacidad" más abajo.

### 2. Sacar la clave de la IA (gratis)

1. Entra a **https://aistudio.google.com/apikey** con tu cuenta de Google.
2. Clic en **"Create API key"**.
3. Copia la clave → es `GEMINI_API_KEY`.

> La capa gratuita de Gemini alcanza de sobra para una tienda: son decenas de
> pedidos al día sin pagar nada. Si algún día se pasa, el agente lo avisa por
> Telegram en vez de fallar en silencio.

### 3. Inventar la clave del webhook

Una contraseña larga y al azar, para que solo Telegram pueda hablarle al agente:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Eso es `TELEGRAM_WEBHOOK_SECRET`.

### 4. Conectar la base de datos (gratis, pero obligatoria)

En Vercel el disco es de **solo lectura**, así que sin base de datos ningún
cambio se guarda — ni los del agente ni los del panel `/admin`.

1. En tu proyecto de Vercel: pestaña **Storage** → **Marketplace** →
   **Upstash** → **Redis** → plan **Free**.
2. Al conectarlo, Vercel agrega solo las variables `KV_REST_API_URL` y
   `KV_REST_API_TOKEN`. No tienes que copiar nada.

> En tu computadora esto no hace falta: en local los datos se guardan en la
> carpeta `data/`.

### 5. Cargar las variables en Vercel

En **Settings → Environment Variables** agrega:

| Variable | Valor |
|---|---|
| `TELEGRAM_BOT_TOKEN` | el token de BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | la clave del paso 3 |
| `TELEGRAM_ALLOWED_CHAT_IDS` | déjala vacía por ahora (paso 7) |
| `GEMINI_API_KEY` | la clave del paso 2 |
| `NEXT_PUBLIC_SITE_URL` | la URL de tu tienda, ej. `https://kona-moda.vercel.app` |

Vuelve a desplegar para que tomen efecto.

### 6. Conectar el bot con la tienda

Abre esto en el navegador, reemplazando por tus datos:

```
https://TU-TIENDA.vercel.app/api/agent/setup?clave=TU_TELEGRAM_WEBHOOK_SECRET
```

Si todo está bien responde `{"ok": true, ...}`.

### 7. Autorizar quién puede darle órdenes

**Opción A — tú sola, chat directo:**

1. En Telegram, escríbele `/start` a tu bot.
2. Te contesta que no tienes permiso **y te dice tu número de chat**.
3. Copia ese número a `TELEGRAM_ALLOWED_CHAT_IDS` en Vercel.
4. Vuelve a desplegar.

**Opción B — un grupo con varias personas** (ver la sección siguiente).

Listo. Escríbele `/start` otra vez y ya te responde con el menú de ayuda.

---

## Usarlo desde un grupo (varias personas)

Es la forma recomendada cuando más de una persona maneja la tienda: las dos ven
lo que pide la otra, y queda escrito quién pidió y quién confirmó cada cambio.

### Cómo armar el grupo

1. En Telegram: menú **☰ → Nuevo grupo**.
2. Elige a la **otra persona** que va a manejar la tienda.
3. Ponle nombre al grupo, ej. `Kona · Cambios web`, y créalo.
4. Ya dentro del grupo: toca el **nombre del grupo arriba → Agregar miembros**
   → busca tu bot por su usuario (ej. `kona_moda_bot`) → agrégalo.

> Telegram no deja crear un grupo con el bot solo: primero agregas a la
> persona, y después al bot.

### Autorizar el grupo

5. En el grupo, escribe `/start`.
6. El bot responde que el grupo no está autorizado **y te da el número del
   grupo**. Es un número **negativo**, tipo `-1001234567890`.
7. Copia ese número **completo, con el signo menos**, a
   `TELEGRAM_ALLOWED_CHAT_IDS` en Vercel.
8. Vuelve a desplegar y escribe `/start` otra vez en el grupo.

### Cómo se usa en el grupo

Igual que en privado: escriben o mandan un audio, y el bot responde colgando su
mensaje del de ustedes, para que se vea a quién le está contestando:

```
María:  pon el Dress Pams Malva en oferta a 89

Bot (respondiendo a María):
  María pidió esto:
  1. Poner en oferta "Dress Pams Malva" a S/ 89 (antes S/ 115)

  ¿Lo aplico?          [ ✅ Confirmar ]   [ ✖️ Cancelar ]

  → ✅ Listo (confirmado por Jose)
     • "Dress Pams Malva" en oferta a S/ 89.
```

**Cualquiera de los dos puede confirmar**, incluso lo que pidió el otro. Es a
propósito: sirve para que una revise lo que pidió la otra. Y como queda escrito
quién hizo qué, siempre se puede rastrear.

### Modo privacidad (la causa nº1 de "no me responde")

Por seguridad, Telegram no deja que los bots lean los mensajes de los grupos.
Con el modo privacidad **activado** (el de fábrica), tu bot solo recibiría:

- mensajes que empiezan con `/`
- mensajes que lo mencionan con `@tu_bot`
- respuestas directas a un mensaje suyo

O sea: escribes "ponle 20% a los vestidos" y **no pasa nada**, y las notas de
voz tampoco le llegan nunca.

**La solución** es el paso 4 del inicio: en BotFather, `/setprivacy` → tu bot →
**Disable**. Después de cambiarlo, **saca el bot del grupo y vuelve a
agregarlo**, porque si no el cambio no toma efecto.

### Cosas a tener en cuenta

- **Quien esté en el grupo, manda.** El permiso es del grupo, no de la persona.
  Si agregan a alguien más, esa persona también podrá cambiar precios. Manténlo
  en las personas de confianza.
- **Si Telegram convierte el grupo en "supergrupo"** (pasa solo al hacerlo
  público o al pasar de cierto tamaño), **el número del grupo cambia** y el bot
  deja de responder. Si pasa: escribe `/start`, te da el número nuevo, y lo
  actualizas en Vercel.
- **Puedes tener las dos cosas a la vez**: el grupo y tu chat privado. Solo
  pon los dos números separados por coma:
  `TELEGRAM_ALLOWED_CHAT_IDS=-1001234567890,123456789`

---

## Trazabilidad: quién cambió qué

Cada cambio confirmado queda anotado. En el panel, **Datos / Historial**
(`/admin/datos`) muestra:

- **Las cuatro bases** — productos, pedidos, ventas e historial — con su
  resumen y un botón para **descargar el CSV** (se abre en Excel).
- **El historial de cambios**, filtrable por **categoría de producto**
  (vestidos, carteras…) y por **tipo de cambio** (descuentos, precios,
  ofertas, productos, stock, temporada).

Cada línea guarda cuándo, quién lo confirmó, qué tipo de cambio fue, sobre
qué categoría y con qué valores quedó. Los cambios que afectan a toda la
tienda aparecen al filtrar por cualquier categoría, porque también la
afectaron. Lo que se propuso y se canceló no se registra.

Se guardan los últimos 500 cambios.

---

## Cómo está hecho (para quien toque el código)

```
Telegram (texto o audio)
   │
   ▼
src/app/api/agent/telegram/route.ts   ← valida el secreto y quién escribe;
   │                                     responde 200 al toque y trabaja detrás
   ▼
src/lib/agent/run.ts                  ← el bucle: pregunta al modelo, ejecuta
   │                                     las lecturas, ANOTA las escrituras
   ├── src/lib/agent/prompt.ts        ← las reglas + foto real de la tienda
   ├── src/lib/agent/gemini.ts        ← llamada a la API (texto y audio)
   └── src/lib/agent/tools.ts         ← la lista CERRADA de acciones posibles
   │
   ▼  (tras el botón Confirmar)
src/lib/store-data.ts / promos-data.ts → src/lib/kv.ts → Upstash o disco
src/lib/historial-data.ts             ← anota el cambio para el panel
```

Decisiones que conviene no romper:

- **El modelo nunca escribe directo.** En `run.ts`, las herramientas marcadas
  `leer: true` se ejecutan al instante (para que el agente sepa qué productos
  existen de verdad); las demás se guardan en un plan y esperan la
  confirmación. Es lo que evita que un audio mal entendido cambie precios.
- **Los nombres se resuelven contra el catálogo real.** `resolverProducto` en
  `tools.ts` traduce "el vestido Pams" a un producto concreto y, si hay varios
  que coinciden, **falla a propósito** pidiendo que se aclare, en vez de
  adivinar.
- **Los precios se leen siempre en crudo** (`raw: true`), nunca con los
  descuentos ya aplicados. Si no, cada cambio de precio iría acumulando
  descuentos sobre descuentos.
- **El plan se guarda con un código de un solo uso** (`pending.ts`), así que
  apretar Confirmar dos veces no aplica los cambios dos veces.
- El audio se le manda a Gemini tal cual, sin transcribirlo antes: entiende
  el OGG de Telegram directamente y eso ahorra un servicio (y su costo).

### Agregar una acción nueva

En `src/lib/agent/tools.ts`, agrega un objeto `Tool` y súmalo al arreglo
`HERRAMIENTAS`. Necesita cuatro cosas: `descripcion` y `parametros` (que son
lo que ve el modelo), `resumen` (la frase que lee la dueña antes de confirmar)
y `ejecutar`. No hay que tocar nada más: el webhook y el prompt se enteran
solos.

### Probar en local

```bash
npm run dev
```

El webhook necesita una URL pública, así que para probar de verdad conviene
desplegar a Vercel. En local se puede probar la lógica llamando a las
herramientas directamente desde una ruta temporal.
