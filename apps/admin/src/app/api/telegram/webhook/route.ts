import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  sendTelegramMessage,
  sendChatAction,
  isOwnerChat,
} from "@/lib/telegram";
import { runAskAssistantCore } from "@/app/actions/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HELP = `🤖 *Skilldrunk Bot*

Komutlar:
\`/brief\` — Bugünkü briefi tekrar at
\`/quote\` — Rastgele günün sözü
\`/ask <soru>\` — AI asistana sor (read-only mode)
\`/stats\` — Hızlı ekosistem özeti
\`/help\` — Bu mesaj

Web: admin.skilldrunk.com`;

const OWNER_USER_ID = "c17394c2-e995-4bd1-87e3-f98f4326ca12";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

type TelegramUpdate = {
  message?: {
    chat: { id: number };
    from?: { id: number; username?: string; first_name?: string };
    text?: string;
    message_id: number;
  };
};

export async function POST(req: NextRequest) {
  // Telegram secret token check (defense-in-depth — chat_id whitelist is primary)
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== secret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const msg = update.message;
  if (!msg?.text) return NextResponse.json({ ok: true });

  const chatId = msg.chat.id;
  if (!isOwnerChat(chatId)) {
    // Not the owner — silently ignore. Don't send "unauthorized" (info leak)
    return NextResponse.json({ ok: true });
  }

  const text = msg.text.trim();
  const [rawCmd, ...rest] = text.split(/\s+/);
  const cmd = rawCmd.toLowerCase().split("@")[0]; // strip @botname
  const args = rest.join(" ").trim();

  // Always return 200 fast; do work async if needed
  void handleCommand(cmd, args, msg);
  return NextResponse.json({ ok: true });
}

async function handleCommand(
  cmd: string,
  args: string,
  msg: NonNullable<TelegramUpdate["message"]>,
): Promise<void> {
  const chatId = msg.chat.id;
  const replyTo = msg.message_id;

  try {
    switch (cmd) {
      case "/start":
      case "/help":
        await sendTelegramMessage(chatId, HELP);
        return;

      case "/brief": {
        await sendChatAction(chatId, "typing");
        const supabase = adminClient();
        if (!supabase) {
          await sendTelegramMessage(chatId, "_(supabase config eksik)_");
          return;
        }
        const today = new Date().toISOString().slice(0, 10);
        const { data: brief } = await supabase
          .from("br_briefings")
          .select("brief_date, summary, body_md")
          .eq("user_id", OWNER_USER_ID)
          .eq("brief_date", today)
          .maybeSingle();
        if (!brief) {
          await sendTelegramMessage(
            chatId,
            "Bugün için brief henüz üretilmemiş. Cron yarın 04:00 UTC'de tekrar dener.",
          );
          return;
        }
        await sendTelegramMessage(
          chatId,
          `*${brief.brief_date}* — ${brief.summary}\n\n${brief.body_md}`,
        );
        return;
      }

      case "/quote": {
        await sendChatAction(chatId, "typing");
        try {
          const r = await fetch("https://quotes.skilldrunk.com/api/random", {
            signal: AbortSignal.timeout(8_000),
          });
          if (!r.ok) throw new Error("quote fetch failed");
          const q = (await r.json()) as {
            quote_text: string;
            author: string;
            nano_detail: string | null;
          };
          let body = `_"${q.quote_text}"_\n— *${q.author}*`;
          if (q.nano_detail) body += `\n\n💡 ${q.nano_detail}`;
          body += `\n\n🔗 quotes.skilldrunk.com`;
          await sendTelegramMessage(chatId, body);
        } catch (err) {
          await sendTelegramMessage(
            chatId,
            `Söz alınamadı: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
        return;
      }

      case "/stats": {
        await sendChatAction(chatId, "typing");
        const supabase = adminClient();
        if (!supabase) {
          await sendTelegramMessage(chatId, "_(supabase config eksik)_");
          return;
        }
        const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString();
        const [
          { count: skills },
          { count: users },
          { count: pv7d },
          { count: events7d },
          { data: aiStats },
        ] = await Promise.all([
          supabase
            .from("sd_skills")
            .select("*", { count: "exact", head: true })
            .eq("status", "published"),
          supabase.from("sd_profiles").select("*", { count: "exact", head: true }),
          supabase
            .from("sd_pageviews")
            .select("*", { count: "exact", head: true })
            .gte("created_at", since7d),
          supabase
            .from("az_events")
            .select("*", { count: "exact", head: true })
            .gte("occurred_at", since7d),
          supabase.rpc("sd_ai_usage_stats", { p_days: 7 }),
        ]);
        const cost =
          (aiStats as { total_cost_usd?: number } | null)?.total_cost_usd ?? 0;
        const calls =
          (aiStats as { total_calls?: number } | null)?.total_calls ?? 0;
        await sendTelegramMessage(
          chatId,
          `📊 *Hızlı Özet*\n\n` +
            `🛠 Skills: \`${skills ?? 0}\`\n` +
            `👤 Users: \`${users ?? 0}\`\n` +
            `📈 7g pageview: \`${pv7d ?? 0}\`\n` +
            `📥 7g events: \`${events7d ?? 0}\`\n` +
            `🤖 7g AI: \`${calls} çağrı\` · \`$${cost.toFixed(4)}\`\n\n` +
            `🔗 admin.skilldrunk.com`,
        );
        return;
      }

      case "/ask": {
        if (!args) {
          await sendTelegramMessage(
            chatId,
            "Kullanım: `/ask <soru>`\nÖrnek: `/ask son 7 günde admin'de kaç pageview?`",
          );
          return;
        }
        await sendChatAction(chatId, "typing");

        const supabase = adminClient();
        if (!supabase) {
          await sendTelegramMessage(chatId, "_(supabase config eksik)_");
          return;
        }

        const res = await runAskAssistantCore({
          supabase,
          userId: OWNER_USER_ID,
          profile: { display_name: "Özgür", username: "LuciFeRADoNiS" },
          history: [],
          userMessage: args,
          context: { page: "telegram", focus: "ad-hoc question" },
          allowWrites: false, // Telegram = read-only
        });

        if (!res.ok) {
          await sendTelegramMessage(chatId, `❌ ${res.error}`);
          return;
        }

        let answer = res.answer;
        if (res.tool_calls.length > 0) {
          const toolSummary = res.tool_calls
            .map(
              (t) =>
                `_${t.error ? "❌" : "✓"} ${t.name}_`,
            )
            .join(" · ");
          answer = `${toolSummary}\n\n${answer}`;
        }
        await sendTelegramMessage(chatId, answer, { reply_to_message_id: replyTo });
        return;
      }

      default:
        if (cmd.startsWith("/")) {
          await sendTelegramMessage(
            chatId,
            `Bilinmeyen komut: \`${cmd}\`\n${HELP}`,
          );
        }
        // Non-command messages: ignore (could route to /ask in future, but keep explicit)
        return;
    }
  } catch (err) {
    await sendTelegramMessage(
      chatId,
      `🚨 Hata: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
