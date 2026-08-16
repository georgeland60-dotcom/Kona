// =============================================================
//  TELEGRAM: mandar y recibir mensajes
//  Funciones sueltas para hablar con la API del bot. Nada de lógica
//  de negocio aquí.
// =============================================================

const API = "https://api.telegram.org";

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

export async function enviarMensaje(
  chatId: number,
  texto: string,
  botones?: Boton[],
  opciones?: { responderA?: number }
): Promise<void> {
  await llamar("sendMessage", {
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
}

// Reemplaza el texto de un mensaje ya enviado y le quita los botones.
// Se usa al confirmar, para que no se pueda apretar dos veces.
export async function editarMensaje(
  chatId: number,
  messageId: number,
  texto: string
): Promise<void> {
  await llamar("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: texto,
    parse_mode: "HTML",
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

// ---- Descargar una nota de voz --------------------------------------

const MAX_AUDIO = 10 * 1024 * 1024; // 10 MB

// Devuelve el audio en base64, que es como lo entiende la IA.
export async function descargarAudio(
  fileId: string
): Promise<{ base64: string; mimeType: string } | null> {
  const info = await llamar<{ file_path?: string; file_size?: number }>(
    "getFile",
    { file_id: fileId }
  );
  if (!info?.file_path) return null;
  if (info.file_size && info.file_size > MAX_AUDIO) return null;

  try {
    const res = await fetch(`${API}/file/bot${token()}/${info.file_path}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > MAX_AUDIO) return null;

    // Las notas de voz de Telegram son OGG/Opus.
    const extension = info.file_path.split(".").pop()?.toLowerCase();
    const mimeType =
      extension === "mp3"
        ? "audio/mp3"
        : extension === "m4a"
          ? "audio/mp4"
          : extension === "wav"
            ? "audio/wav"
            : "audio/ogg";

    return { base64: buffer.toString("base64"), mimeType };
  } catch {
    return null;
  }
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
