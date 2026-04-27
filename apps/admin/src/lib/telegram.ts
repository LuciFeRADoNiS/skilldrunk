/**
 * Telegram Bot API helpers — admin-side.
 * Token + chat_id come from env (set per project on Vercel).
 */

const API = "https://api.telegram.org";

function token(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN ?? null;
}

function ownerChatId(): string | null {
  return process.env.TELEGRAM_CHAT_ID ?? null;
}

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  opts: { parse_mode?: "Markdown" | "MarkdownV2" | "HTML"; reply_to_message_id?: number } = {},
): Promise<boolean> {
  const t = token();
  if (!t) return false;

  // Telegram message limit ~4096 chars; chunk if longer
  const MAX = 3800;
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > MAX) {
    let cut = remaining.lastIndexOf("\n\n", MAX);
    if (cut < MAX / 2) cut = remaining.lastIndexOf("\n", MAX);
    if (cut < MAX / 2) cut = MAX;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trimStart();
  }
  if (remaining) chunks.push(remaining);

  let allOk = true;
  for (const chunk of chunks) {
    try {
      const res = await fetch(`${API}/bot${t}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunk,
          parse_mode: opts.parse_mode ?? "Markdown",
          disable_web_page_preview: true,
          ...(opts.reply_to_message_id
            ? { reply_to_message_id: opts.reply_to_message_id }
            : {}),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) allOk = false;
    } catch {
      allOk = false;
    }
  }
  return allOk;
}

export async function sendChatAction(
  chatId: number | string,
  action: "typing" | "upload_photo" = "typing",
): Promise<void> {
  const t = token();
  if (!t) return;
  try {
    await fetch(`${API}/bot${t}/sendChatAction`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // ignore
  }
}

export function isOwnerChat(chatId: number | string): boolean {
  const owner = ownerChatId();
  if (!owner) return false;
  return String(chatId) === String(owner);
}

/** Escape Markdown special chars in user-facing text (basic). */
export function md(s: string): string {
  return s.replace(/([_*`[\]()])/g, "\\$1");
}
