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

*Backlog (havuz)*
\`/todo <başlık> [-p proje] [-pr 1-5]\` — yeni iş
\`/done <id>\` — bitir
\`/open\` — devam edenler
\`/next [proje]\` — sıradakiler
\`/backlog [proje]\` — tüm aktif

*Veri/AI*
\`/brief\` — bugünkü brief
\`/quote\` — günün sözü
\`/ask <soru>\` — AI asistan (read-only)
\`/stats\` — hızlı özet
\`/help\` — bu mesaj

Web: admin.skilldrunk.com/backlog`;

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

  // Vercel serverless functions terminate after response — must await.
  // Telegram timeout is 60s; our handlers stay well under.
  try {
    await handleCommand(cmd, args, msg);
  } catch (err) {
    console.error("[telegram] handleCommand failed:", err);
  }
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

      case "/todo": {
        if (!args) {
          await sendTelegramMessage(
            chatId,
            "Kullanım: `/todo başlık [-p proje] [-pr 1-5]`\nÖrnek: `/todo Quotes v2 swipe -p quotes-v2 -pr 1`",
          );
          return;
        }
        const supabase = adminClient();
        if (!supabase) {
          await sendTelegramMessage(chatId, "_(supabase config eksik)_");
          return;
        }
        // Parse -p <slug> and -pr <n> out of args
        let project = "general";
        let priority = 3;
        let title = args;
        const pMatch = title.match(/\s-p\s+([\w-]+)/);
        if (pMatch) {
          project = pMatch[1];
          title = title.replace(pMatch[0], "");
        }
        const prMatch = title.match(/\s-pr\s+([1-5])/);
        if (prMatch) {
          priority = parseInt(prMatch[1], 10);
          title = title.replace(prMatch[0], "");
        }
        title = title.trim();
        if (!title) {
          await sendTelegramMessage(chatId, "Başlık boş olamaz.");
          return;
        }
        const { data, error } = await supabase.rpc("sd_backlog_add", {
          p_title: title,
          p_project: project,
          p_priority: priority,
          p_source: "telegram",
          p_status: "next",
          p_tags: [],
        });
        if (error) {
          await sendTelegramMessage(chatId, `❌ ${error.message}`);
          return;
        }
        const row = data as { id: number; title: string };
        await sendTelegramMessage(
          chatId,
          `✓ #${row.id} \`${row.title}\`\nproje: \`${project}\` · P${priority}`,
          { reply_to_message_id: replyTo },
        );
        return;
      }

      case "/done": {
        const id = parseInt(args, 10);
        if (!Number.isFinite(id) || id <= 0) {
          await sendTelegramMessage(chatId, "Kullanım: `/done <id>`");
          return;
        }
        const supabase = adminClient();
        if (!supabase) {
          await sendTelegramMessage(chatId, "_(supabase config eksik)_");
          return;
        }
        const { data, error } = await supabase.rpc("sd_backlog_set_status", {
          p_id: id,
          p_status: "done",
        });
        if (error) {
          await sendTelegramMessage(chatId, `❌ ${error.message}`);
          return;
        }
        const row = data as { title?: string } | null;
        if (!row?.title) {
          await sendTelegramMessage(chatId, `Kayıt #${id} bulunamadı.`);
          return;
        }
        await sendTelegramMessage(
          chatId,
          `✅ #${id} bitti — \`${row.title}\``,
          { reply_to_message_id: replyTo },
        );
        return;
      }

      case "/open":
      case "/next":
      case "/backlog": {
        const supabase = adminClient();
        if (!supabase) {
          await sendTelegramMessage(chatId, "_(supabase config eksik)_");
          return;
        }
        const projectArg = args.trim() || null;

        let query = supabase
          .from("sd_backlog")
          .select("id, title, project, status, priority")
          .order("priority", { ascending: true })
          .order("updated_at", { ascending: false })
          .limit(20);

        if (cmd === "/open") query = query.eq("status", "in_progress");
        else if (cmd === "/next") query = query.eq("status", "next");
        else query = query.in("status", ["in_progress", "next", "blocked"]);

        if (projectArg) query = query.eq("project", projectArg);

        const { data: rows, error } = await query;
        if (error) {
          await sendTelegramMessage(chatId, `❌ ${error.message}`);
          return;
        }
        const list = (rows ?? []) as Array<{
          id: number;
          title: string;
          project: string;
          status: string;
          priority: number;
        }>;
        if (list.length === 0) {
          await sendTelegramMessage(
            chatId,
            `_(${cmd} ${projectArg ?? ""} için kayıt yok)_`,
          );
          return;
        }
        const STATUS_ICON: Record<string, string> = {
          in_progress: "▶",
          next: "•",
          blocked: "⏸",
        };
        const body = list
          .map(
            (r) =>
              `${STATUS_ICON[r.status] ?? "·"} *#${r.id}* P${r.priority} _${r.project}_\n   ${r.title}`,
          )
          .join("\n\n");
        const header =
          cmd === "/open"
            ? `▶ *Devam edenler*`
            : cmd === "/next"
              ? `• *Sıradakiler*`
              : `📋 *Aktif backlog*`;
        await sendTelegramMessage(
          chatId,
          `${header}${projectArg ? ` · \`${projectArg}\`` : ""}\n\n${body}\n\n_${list.length} kayıt — admin.skilldrunk.com/backlog_`,
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
