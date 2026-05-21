/**
 * Apollo bot (@SunoBot) notification helper.
 *
 * Sends inline-keyboard messages to the admin's Telegram chat via the
 * Bot API directly — no separate VPS service required. Inline button
 * callbacks come back to /api/telegram/apollo-webhook on the same domain
 * (Telegram bot webhook URL is bound to that route).
 *
 * Failures are logged but never thrown — bot notifications must not
 * block the main user flow (task submit / approve).
 */

type SendOptions = {
  text: string;
  /** Telegram inline_keyboard rows. Each button: { text, callback_data } */
  buttons?: { text: string; callback_data: string }[][];
};

export async function notifyApollo({ text, buttons }: SendOptions): Promise<boolean> {
  const token = process.env.APOLLO_BOT_TOKEN;
  const chatId = process.env.APOLLO_NOTIFY_CHAT_ID;

  if (!token || !chatId) {
    // Bot not configured yet — silently skip in early dev / preview.
    return false;
  }

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (buttons && buttons.length > 0) {
    body.reply_markup = { inline_keyboard: buttons };
  }

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // Vercel function: keep this short — Telegram is fast (~200ms typical)
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) {
      console.error("apollo-bot send failed", r.status, await r.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("apollo-bot send error", err);
    return false;
  }
}

/** Sanitize user-controlled text for Telegram HTML parse mode. */
export function htmlEsc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ─── Pre-baked message templates ────────────────────────────────────────

export type TaskNotifyContext = {
  taskId: number;
  staffName: string;
  prospectName: string;
  prospectCompany: string | null;
  templateName: string;
};

export function buildAssignedMessage(ctx: TaskNotifyContext): SendOptions {
  const prospectLabel = ctx.prospectCompany
    ? `${ctx.prospectName} (${ctx.prospectCompany})`
    : ctx.prospectName;
  return {
    text:
      `🎯 <b>Görev atandı</b>\n` +
      `<b>${htmlEsc(ctx.staffName)}</b> → ${htmlEsc(prospectLabel)}\n` +
      `<i>${htmlEsc(ctx.templateName)}</i>`,
  };
}

export function buildSubmittedMessage(
  ctx: TaskNotifyContext & { hasPersonalization: boolean; sentAtIso: string },
): SendOptions {
  const prospectLabel = ctx.prospectCompany
    ? `${ctx.prospectName} (${ctx.prospectCompany})`
    : ctx.prospectName;
  const sentAt = new Date(ctx.sentAtIso).toLocaleString("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  });
  const personalNote = ctx.hasPersonalization ? "  ✎ özelleştirme notu var" : "";
  return {
    text:
      `✅ <b>Mail gönderildi</b>\n` +
      `<b>${htmlEsc(ctx.staffName)}</b> → ${htmlEsc(prospectLabel)}\n` +
      `<i>${htmlEsc(ctx.templateName)}</i> · ${htmlEsc(sentAt)}${personalNote}\n` +
      `CC inbox'ında kontrol et ↓`,
    buttons: [
      [
        { text: "✓ Onayla", callback_data: `approve:${ctx.taskId}` },
        { text: "✗ Reddet", callback_data: `reject:${ctx.taskId}` },
      ],
    ],
  };
}

export function buildApprovedMessage(ctx: TaskNotifyContext): SendOptions {
  return {
    text:
      `✓ <b>Onaylandı</b> — ${htmlEsc(ctx.staffName)} / ${htmlEsc(ctx.prospectName)}`,
  };
}

export function buildRejectedMessage(
  ctx: TaskNotifyContext & { reason: string | null },
): SendOptions {
  return {
    text:
      `✗ <b>Reddedildi</b> — ${htmlEsc(ctx.staffName)} / ${htmlEsc(ctx.prospectName)}` +
      (ctx.reason ? `\n<i>${htmlEsc(ctx.reason)}</i>` : ""),
  };
}
