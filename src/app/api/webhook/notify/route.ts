import { NextRequest, NextResponse } from "next/server";

/**
 * Internal webhook receiver — called by pg_net from Supabase triggers.
 * Forwards notifications to configured channels (Telegram, Slack, etc.)
 *
 * To use Telegram: set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID env vars.
 * To use Slack: set SLACK_WEBHOOK_URL env var.
 */
export async function POST(req: NextRequest) {
  try {
    const { kind, message } = await req.json();
    if (!kind || !message) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const emoji =
      kind === "new_user"
        ? "👤"
        : kind === "new_skill"
          ? "🆕"
          : kind === "new_report"
            ? "🚩"
            : "🔔";

    const text = `${emoji} *skilldrunk* — ${message}`;

    // Telegram push
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChat = process.env.TELEGRAM_CHAT_ID;
    if (telegramToken && telegramChat) {
      await fetch(
        `https://api.telegram.org/bot${telegramToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: telegramChat,
            text,
            parse_mode: "Markdown",
          }),
        }
      ).catch(() => {});
    }

    // Slack push
    const slackUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackUrl) {
      await fetch(slackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
