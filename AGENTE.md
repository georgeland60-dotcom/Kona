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

1. En Telegram, busca **@BotFather** y escríbele `/newbot`.
2. Ponle un nombre (ej. `Kona Asistente`) y un usuario que termine en `bot`.
3. Te va a dar un **token** tipo `8123456789:AAF...`. Guárdalo → es
   `TELEGRAM_BOT_TOKEN`.

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

### 7. Autorizarte a ti misma

1. En Telegram, escríbele `/start` a tu bot.
2. Te va a contestar que no tienes permiso **y te va a decir tu número de chat**.
3. Copia ese número a la variable `TELEGRAM_ALLOWED_CHAT_IDS` en Vercel
   (si son varias personas, sepáralas con coma: `123456,789012`).
4. Vuelve a desplegar.

Listo. Escríbele `/start` otra vez y ya te responde con el menú de ayuda.

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
