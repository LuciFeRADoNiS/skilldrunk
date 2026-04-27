/**
 * Brief composer — takes yesterday's analiz events + today's calendar info,
 * asks Claude Haiku to produce a morning briefing in markdown.
 *
 * Falls back to a deterministic template if ANTHROPIC_API_KEY is missing,
 * so the feature is always usable without external dependencies.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type AnalizEvent = {
  kind: string;
  title: string;
  body: string | null;
  tags: string[];
  occurred_at: string;
  metadata: Record<string, unknown>;
};

export type BriefResult = {
  summary: string;
  body_md: string;
  model: string | null;
  metadata: {
    events_in_window: number;
    window_start: string;
    window_end: string;
    input_tokens?: number;
    output_tokens?: number;
    cost_usd?: number;
  };
};

/**
 * Compose a daily brief for a given user + target date (YYYY-MM-DD).
 * "Brief for 2026-04-24" summarizes events whose occurred_at is in
 * [2026-04-23 00:00, 2026-04-24 00:00) — i.e., the previous day.
 */
export async function composeBrief(
  supabase: SupabaseClient,
  userId: string,
  briefDate: string,
): Promise<BriefResult> {
  const target = new Date(`${briefDate}T00:00:00Z`);
  const start = new Date(target);
  start.setUTCDate(start.getUTCDate() - 1);
  const end = target;

  const { data: eventsData } = await supabase
    .from("az_events")
    .select("kind, title, body, tags, occurred_at, metadata")
    .eq("user_id", userId)
    .gte("occurred_at", start.toISOString())
    .lt("occurred_at", end.toISOString())
    .order("occurred_at", { ascending: true })
    .limit(200);

  const events = (eventsData ?? []) as AnalizEvent[];

  const metadata: BriefResult["metadata"] = {
    events_in_window: events.length,
    window_start: start.toISOString(),
    window_end: end.toISOString(),
  };

  // If no events, keep it short and honest
  if (events.length === 0) {
    return {
      summary: `${briefDate} — hiç event yok.`,
      body_md: `# ${briefDate} Brief\n\nDün vault'a hiç yeni event düşmemiş.\n\n*(Obsidian watcher çalışıyor mu?)*`,
      model: null,
      metadata,
    };
  }

  // Build compact prompt input
  const input = events
    .map((e) => {
      const t = new Date(e.occurred_at).toISOString().slice(0, 16);
      const b = (e.body ?? "").slice(0, 180).replace(/\s+/g, " ").trim();
      const kind = e.kind.split(":")[0];
      return `- [${t}] (${kind}) ${e.title}${b ? ` — ${b}` : ""}`;
    })
    .join("\n");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Deterministic fallback — group by kind, count, show top titles
    const byKind = new Map<string, AnalizEvent[]>();
    for (const e of events) {
      const k = e.kind.split(":")[0];
      const arr = byKind.get(k) ?? [];
      arr.push(e);
      byKind.set(k, arr);
    }
    const lines: string[] = [`# ${briefDate} Brief`, "", "_(Auto-generated, no LLM)_", ""];
    for (const [kind, arr] of Array.from(byKind.entries()).sort(
      (a, b) => b[1].length - a[1].length,
    )) {
      lines.push(`## ${kind} (${arr.length})`);
      for (const e of arr.slice(0, 5)) {
        lines.push(`- ${e.title}`);
      }
      if (arr.length > 5) lines.push(`- …ve ${arr.length - 5} daha`);
      lines.push("");
    }
    return {
      summary: `${briefDate}: ${events.length} event, ${byKind.size} farklı tip.`,
      body_md: lines.join("\n"),
      model: null,
      metadata,
    };
  }

  // Claude Haiku compose
  const prompt = buildPrompt(briefDate, input, events.length);

  const { callClaude } = await import("@skilldrunk/llm");
  const res = await callClaude({
    apiKey,
    model: "claude-haiku-4-5",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
    app: "brief",
    route: "/lib/compose",
    userId,
    metadata: { brief_date: briefDate, events_count: events.length },
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!res.ok) {
    throw new Error(`anthropic api error: ${res.error}`);
  }

  const text =
    (res.data.content?.find((c) => (c as { type: string }).type === "text") as
      | { text?: string }
      | undefined
    )?.text ?? "";
  const { summary, body_md } = splitBrief(text, briefDate);

  return {
    summary,
    body_md,
    model: res.model,
    metadata: {
      ...metadata,
      input_tokens: res.usage.input_tokens,
      output_tokens: res.usage.output_tokens,
      cost_usd: res.cost_usd,
    },
  };
}

function buildPrompt(date: string, events: string, count: number): string {
  return `You are Özgür's personal chief of staff. Produce a morning brief in Turkish for ${date}, based on ${count} events from yesterday.

Format the response as markdown with this EXACT structure:

SUMMARY: <one sentence, ≤120 chars, in Turkish, what yesterday was about>

---

# ${date} Brief

## Dün ne oldu?
- bullet point, sharp
- prioritize: meetings, decisions, blockers, notable activity

## Öne çıkanlar
<2-4 key themes/insights from the day — short paragraphs or bullets>

## Dikkat
<actionable items that need attention today OR patterns worth noting>

---

Events (newest last):
${events}

Rules:
- Turkish, professional but warm
- Be concrete — reference actual people/companies/projects by name when in events
- If you see repeated meetings with same person/company, note the pattern
- Skip trivial things (file edits on routine notes) unless they matter
- Don't hallucinate — only use what's in the events
- Start response with "SUMMARY: ..." then "---" then the markdown body. No preamble, no code fences.`;
}

function splitBrief(
  text: string,
  date: string,
): { summary: string; body_md: string } {
  const trimmed = text.trim();
  const summaryMatch = trimmed.match(/^SUMMARY:\s*(.+?)(?:\n|$)/);
  if (!summaryMatch) {
    // Malformed response — take first line as summary
    const firstLine = trimmed.split("\n")[0].slice(0, 120);
    return {
      summary: firstLine || `${date} brief`,
      body_md: trimmed,
    };
  }
  const summary = summaryMatch[1].trim().slice(0, 240);
  const bodyStart = trimmed.indexOf("\n---");
  const body_md =
    bodyStart >= 0
      ? trimmed.slice(bodyStart + 4).trim()
      : trimmed.replace(/^SUMMARY:.*?\n/, "").trim();
  return { summary, body_md };
}
