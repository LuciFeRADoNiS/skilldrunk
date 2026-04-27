import { NextRequest, NextResponse } from "next/server";
import type { Quote } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/ai { category?, mood? } — Claude Haiku generates a fresh quote
 * on demand. Returns Quote shape (without db id; clients treat as ephemeral).
 *
 * Falls back gracefully when ANTHROPIC_API_KEY is missing — returns 503 with
 * a hint. Client can then fall back to /api/random.
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ai_disabled", message: "ANTHROPIC_API_KEY not set on this app" },
      { status: 503 },
    );
  }

  let body: { category?: string; mood?: string } = {};
  try {
    body = await req.json();
  } catch {}

  const category = (body.category ?? "").slice(0, 40);
  const mood = (body.mood ?? "").slice(0, 60);

  const prompt = `Sen Özgür'ün günlük ilham botu sun. ONE anlamlı, derin bir söz üret.

Kurallar:
- Söz **özgün** olmalı — klasik filozofları kopyalama, senin yaratıcı üretimin
- Türkçe, 8-25 kelime arası, şiirsel ama yalın
- Bir **gerçek yazar/mucit/sanatçı/girişimci** ağzından söyle (gerçek kişi, ama bu sözü YAZMAMIŞ olabilir — stilini taklit et)
- Sonra 2-3 cümlelik **"nano detay"** ekle — sözün arkasındaki ince bağlam, tarihsel bağlantı, veya Özgür'ün ekosistemine gönderme (4 şirket yönetir, 1 Obsidian vault'u, 4 AI bot, Supabase + Next.js ekosistem, skilldrunk.com)
${category ? `- Kategori: ${category}\n` : ""}${mood ? `- Ruh: ${mood}\n` : ""}
JSON formatında döndür:
{
  "quote_text": "...",
  "author": "...",
  "category": "...",
  "nano_detail": "..."
}

Sadece JSON döndür, başka metin yok.`;

  try {
    const { callClaude } = await import("@skilldrunk/llm");
    const res = await callClaude({
      apiKey,
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      timeoutMs: 25_000,
      messages: [{ role: "user", content: prompt }],
      app: "quotes",
      route: "/api/ai",
      metadata: { category, mood },
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "anthropic_error", detail: res.error.slice(0, 300) },
        { status: 502 },
      );
    }

    const text =
      (res.data.content?.find((c) => (c as { type: string }).type === "text") as
        | { text?: string }
        | undefined
      )?.text ?? "";

    // Try to extract JSON from the response (strip markdown fences if any)
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/\s*```$/, "")
      .trim();

    let parsed: Quote;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "parse_failed", raw: text.slice(0, 400) },
        { status: 502 },
      );
    }

    return NextResponse.json({
      id: `ai-${Date.now()}`,
      quote_text: parsed.quote_text,
      author: parsed.author,
      category: parsed.category ?? null,
      nano_detail: parsed.nano_detail ?? null,
      source: "ai_generated",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "request_failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
