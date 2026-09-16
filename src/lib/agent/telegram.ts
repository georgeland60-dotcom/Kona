// =============================================================
//  TELEGRAM: mandar y recibir mensajes
//  Funciones sueltas para hablar con la API del bot. Nada de lógica
//  de negocio aquí.
// =============================================================

// La dirección de la API de Telegram. Se puede apuntar a otro sitio para
// probar el flujo completo sin un bot de verdad.
const API = process.env.TELEGRAM_API_URL || "https://api.telegram.org";

function token(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("Falta TELEGRAM_BOT_TOKEN");
  return t;
}

async function llamar<T = unknown>(
  metodo: string,
  cuerpo: Record<string, unknown>
): Promise<T | null> {
  try {
    const res = await fetch(`${API}/bot${token()}/${metodo}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
      cache: "no-store",
    });
    const data = (await res.json()) as { ok: boolean; result?: T };
    return data.ok ? (data.result ?? null) : null;
  } catch {
    return null;
  }
}

// Telegram interpreta HTML, así que hay que escapar lo que escribe
// el agente o un "<" cualquiera rompe el mensaje.
export function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export type Boton = { texto: string; dato: string };

// Devuelve el id del mensaje enviado (o null si no se pudo), para poder
// editarlo después: así el aviso de "pensando" se convierte en la
// respuesta en vez de dejar dos mensajes.
export async function enviarMensaje(
  chatId: number,
  texto: string,
  botones?: Boton[],
  opciones?: { responderA?: number }
): Promise<number | null> {
  const res = await llamar<{ message_id?: number }>("sendMessage", {
    chat_id: chatId,
    text: texto,
    parse_mode: "HTML",
    // En un grupo conviene "colgar" la respuesta del mensaje original,
    // para que se vea a quién le estamos contestando.
    ...(opciones?.responderA
      ? {
          reply_parameters: {
            message_id: opciones.responderA,
            allow_sending_without_reply: true,
          },
        }
      : {}),
    ...(botones && botones.length > 0
      ? {
          reply_markup: {
            inline_keyboard: [
              botones.map((b) => ({
                text: b.texto,
                callback_data: b.dato,
              })),
            ],
          },
        }
      : {}),
  });
  return res?.message_id ?? null;
}

// Reemplaza el texto de un mensaje ya enviado. Sin botones se los quita,
// que es lo que se usa al confirmar para que no se pueda apretar dos veces.
export async function editarMensaje(
  chatId: number,
  messageId: number,
  texto: string,
  botones?: Boton[]
): Promise<void> {
  await llamar("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: texto,
    parse_mode: "HTML",
    ...(botones && botones.length > 0
      ? {
          reply_markup: {
            inline_keyboard: [
              botones.map((b) => ({ text: b.texto, callback_data: b.dato })),
            ],
          },
        }
      : {}),
  });
}

// Apaga el "relojito" del botón que apretó la dueña.
export async function responderBoton(
  callbackId: string,
  aviso?: string
): Promise<void> {
  await llamar("answerCallbackQuery", {
    callback_query_id: callbackId,
    ...(aviso ? { text: aviso } : {}),
  });
}

// Muestra "escribiendo..." mientras el agente piensa.
export async function mostrarEscribiendo(chatId: number): Promise<void> {
  await llamar("sendChatAction", { chat_id: chatId, action: "typing" });
}

// ---- Descargar lo que manda la dueña --------------------------------

const MAX_ARCHIVO = 10 * 1024 * 1024; // 10 MB

// Baja un archivo de Telegram (audio o foto) y devuelve sus bytes.
export async function descargarArchivo(
  fileId: string
): Promise<{ bytes: Buffer; extension: string } | null> {
  const info = await llamar<{ file_path?: string; file_size?: number }>(
    "getFile",
    { file_id: fileId }
  );
  if (!info?.file_path) return null;
  if (info.file_size && info.file_size > MAX_ARCHIVO) return null;

  try {
    const res = await fetch(`${API}/file/bot${token()}/${info.file_path}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;

    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength > MAX_ARCHIVO) return null;

    return {
      bytes,
      extension: (info.file_path.split(".").pop() || "").toLowerCase(),
    };
  } catch {
    return null;
  }
}

// Devuelve el audio en base64, que es como lo entiende la IA.
export async function descargarAudio(
  fileId: string
): Promise<{ base64: string; mimeType: string } | null> {
  const archivo = await descargarArchivo(fileId);
  if (!archivo) return null;

  // Las notas de voz de Telegram son OGG/Opus.
  const mimeType =
    archivo.extension === "mp3"
      ? "audio/mp3"
      : archivo.extension === "m4a"
        ? "audio/mp4"
        : archivo.extension === "wav"
          ? "audio/wav"
          : "audio/ogg";

  return { base64: archivo.bytes.toString("base64"), mimeType };
}

// Baja una foto y devuelve sus bytes con el tipo que le corresponde.
export async function descargarFoto(
  fileId: string
): Promise<{ bytes: Buffer; mime: string } | null> {
  const archivo = await descargarArchivo(fileId);
  if (!archivo) return null;

  const mime =
    archivo.extension === "png"
      ? "image/png"
      : archivo.extension === "webp"
        ? "image/webp"
        : "image/jpeg";

  return { bytes: archivo.bytes, mime };
}

// ---- Registrar el webhook (se usa una sola vez, al instalar) --------

export async function registrarWebhook(
  url: string,
  secreto: string
): Promise<boolean> {
  const res = await llamar<boolean>("setWebhook", {
    url,
    secret_token: secreto,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
  return res === true;
}
