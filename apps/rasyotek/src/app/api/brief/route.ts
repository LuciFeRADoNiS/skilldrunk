import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@skilldrunk/supabase/server";
import { callClaude } from "@skilldrunk/llm";
import { adminClient, buildClaudeSystem } from "@/lib/context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 90;

const MODEL = "claude-sonnet-4-5-20250929";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function pushToTelegram(text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return false;
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: text.slice(0, 4000),
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

function buildBriefPrompt(
  briefType: string,
  topic: string | null,
  notes: any[],
  recentChats: any[],
): string {
  const noteList = notes.length
    ? notes
        .map(
          (n) =>
            `- [${n.note_type}, ${new Date(n.created_at).toLocaleDateString("tr-TR")}${n.meeting_date ? `, meeting: ${n.meeting_date}` : ""}] ${n.title ? n.title + " — " : ""}${n.body_md.slice(0, 400)}`,
        )
        .join("\n")
    : "(not yok)";

  const chatList = recentChats.length
    ? recentChats
        .map((c) => `- [${c.role}] ${c.content_text?.slice(0, 300) ?? ""}`)
        .join("\n")
    : "(chat yok)";

  if (briefType === "meeting_outcome") {
    return `**Toplantı Çıktısı Brief'i üret.**

Aşağıdaki notlar Özgür'ün son toplantı(lar)ından. Bunları paket bağlamı ile sentezle ve şu yapıda 300-500 kelime brief üret:

## Toplantı Özeti (Headline)
Tek paragrafta ne oldu.

## Yeni Bilgiler / Sürprizler
Önceki paketle çelişen veya yeni bulgular.

## Güncellenmesi Gereken Risk Skorları
Notlardaki bilgi ışığında hangi rt_risks (S1-S9) skorları değişmeli? Tavsiye et.

## Sonraki Aksiyonlar (3-5 madde)
Kim, ne zaman, ne yapacak.

## Açık Sorular
Cevap bekleyen meseleler.

---

# Notlar
${noteList}

# Son Chat Geçmişi (varsa)
${chatList}`;
  }

  if (briefType === "weekly") {
    return `**Haftalık Brief üret.**

Son 7 günün özeti. 300-400 kelime, şu yapıda:

## Bu Hafta (Headline)
## Tamamlanan
## Devam Eden
## Açık Riskler (skoru ≥10 olanlar)
## Sonraki Hafta Planı

---

# Notlar (son 7 gün)
${noteList}

# Son Chat'ler
${chatList}`;
  }

  // adhoc
  return `**Ad-hoc Brief üret.** Konu: ${topic ?? "(belirsiz)"}

Özgür'ün bu konudaki notlarını + paket bağlamını sentezle. 200-400 kelime, anlamlı bir başlık + 3-5 madde + son aksiyon önerisi.

---

# Notlar
${noteList}

# Chat'ler
${chatList}`;
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const briefType: string = body.brief_type ?? "adhoc";
  const topic: string | null = body.topic ?? null;
  const pushTelegram: boolean = body.push_telegram ?? false;

  const sb = adminClient();

  // Gather notes (last 14 days for meeting, 7 days for weekly, all for adhoc)
  let notesQuery = sb
    .from("rt_notes")
    .select("id,note_type,title,body_md,meeting_date,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (briefType === "meeting_outcome") {
    notesQuery = notesQuery.gte(
      "created_at",
      new Date(Date.now() - 14 * 86400000).toISOString(),
    );
  } else if (briefType === "weekly") {
    notesQuery = notesQuery.gte(
      "created_at",
      new Date(Date.now() - 7 * 86400000).toISOString(),
    );
  } else {
    notesQuery = notesQuery.limit(30);
  }

  const { data: notes } = await notesQuery;

  // Gather recent chat messages (last 3 sessions, text only)
  const { data: recentSessions } = await sb
    .from("rt_chat_sessions")
    .select("id")
    .eq("user_id", user.id)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(3);
  const sessionIds = (recentSessions ?? []).map((s) => s.id);
  let recentChats: any[] = [];
  if (sessionIds.length) {
    const { data: chats } = await sb
      .from("rt_chat_messages")
      .select("role,content_text,created_at")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: false })
      .limit(30);
    recentChats = chats ?? [];
  }

  const userPrompt = buildBriefPrompt(briefType, topic, notes ?? [], recentChats);
  const systemBlocks = await buildClaudeSystem();

  const result = await callClaude({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: MODEL,
    // @ts-expect-error system can be array
    system: systemBlocks,
    messages: [{ role: "user", content: [{ type: "text", text: userPrompt }] }],
    max_tokens: 2048,
    app: "rasyotek-brief",
    route: "/api/brief",
    userId: user.id,
    metadata: { brief_type: briefType, topic },
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: `Claude API: ${result.error}` },
      { status: 500 },
    );
  }

  const text = (result.data.content ?? [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n\n");

  // Extract title + summary
  const firstLine = text.split("\n").find((l) => l.trim().length > 0) ?? "Brief";
  const title = firstLine
    .replace(/^#+\s*/, "")
    .replace(/^\*+/, "")
    .slice(0, 100);
  const summary = text
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .slice(0, 2)
    .join(" ")
    .slice(0, 280);

  const { data: brief, error: briefErr } = await sb
    .from("rt_briefs")
    .insert({
      user_id: user.id,
      brief_type: briefType,
      title,
      summary,
      body_md: text,
      source_note_ids: (notes ?? []).map((n) => n.id),
      model: result.model,
      input_tokens: result.usage.input_tokens,
      output_tokens: result.usage.output_tokens,
      cache_read_input_tokens: result.usage.cache_read_input_tokens,
      cost_usd: result.cost_usd,
      metadata: { topic, source_chats_count: recentChats.length },
    })
    .select()
    .single();

  if (briefErr) {
    return NextResponse.json({ error: briefErr.message }, { status: 500 });
  }

  if (pushTelegram) {
    const pushed = await pushToTelegram(
      `*${title}*\n\n${text}\n\n🔗 https://rasyotek.skilldrunk.com/brief`,
    );
    if (pushed) {
      await sb
        .from("rt_briefs")
        .update({ pushed_telegram_at: new Date().toISOString() })
        .eq("id", brief.id);
    }
  }

  return NextResponse.json({ brief });
}
