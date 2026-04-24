/**
 * Optional Telegram push. No-op if TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
 * aren't set. Markdown is trimmed to Telegram's 4096-char limit.
 */
export async function pushToTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  const body = text.length > 3800 ? text.slice(0, 3800) + "\n\n…(devamı /)" : text;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: body,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}
