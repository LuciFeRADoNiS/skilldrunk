import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin";
import { pushToTelegram } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

/**
 * Weekly digest — Pazar 22:00 İstanbul (= 19:00 UTC). Vercel cron triggers
 * GET with Authorization: Bearer ${CRON_SECRET}.
 *
 * Compiles last 7 days across the ecosystem, asks Claude Haiku for an
 * editorial summary, pushes to Telegram (if configured).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "no_admin" }, { status: 500 });
  }

  // Find owner (admin user)
  const { data: owner } = await admin
    .from("sd_profiles")
    .select("id, username, display_name")
    .eq("role", "admin")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!owner) {
    return NextResponse.json({ error: "no_admin_user" }, { status: 500 });
  }

  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();

  // Pull data in parallel
  const [
    { data: events, count: eventsTotal },
    { count: pvTotal },
    { data: dailyBriefs },
    { data: audit },
    { data: pageviewsByHost },
  ] = await Promise.all([
    admin
      .from("az_events")
      .select("source, kind, title, occurred_at", { count: "exact" })
      .eq("user_id", owner.id)
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(60),
    admin
      .from("sd_pageviews")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since),
    admin
      .from("br_briefings")
      .select("brief_date, summary")
      .eq("user_id", owner.id)
      .gte("brief_date", since.slice(0, 10))
      .order("brief_date", { ascending: false }),
    admin
      .from("sd_audit_log")
      .select("action, target_type, metadata, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50),
    admin.rpc("sd_pageviews_by_host", { p_days: 7 }),
  ]);

  // Aggregate event sources
  const sourceCounts = new Map<string, number>();
  for (const e of (events ?? []) as { source: string }[]) {
    sourceCounts.set(e.source, (sourceCounts.get(e.source) ?? 0) + 1);
  }

  // Top kinds
  const kindCounts = new Map<string, number>();
  for (const e of (events ?? []) as { kind: string }[]) {
    kindCounts.set(e.kind, (kindCounts.get(e.kind) ?? 0) + 1);
  }
  const topKinds = Array.from(kindCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const stats = {
    events_total: eventsTotal ?? 0,
    pv_total: pvTotal ?? 0,
    briefs_count: dailyBriefs?.length ?? 0,
    audit_actions: audit?.length ?? 0,
    sources: Object.fromEntries(sourceCounts),
    top_kinds: topKinds.map(([kind, count]) => ({ kind, count })),
    pv_by_host: pageviewsByHost ?? {},
  };

  const compactInput = `
Events (60 örnek):
${(events ?? [])
  .slice(0, 60)
  .map((e: { occurred_at: string; kind: string; title: string }) => {
    const t = new Date(e.occurred_at).toISOString().slice(5, 10);
    return `- [${t}] ${e.kind}: ${(e.title ?? "").slice(0, 80)}`;
  })
  .join("\n")}

Briefler bu hafta: ${stats.briefs_count} gün
Toplam pageview: ${stats.pv_total} | Toplam event: ${stats.events_total}
Kaynaklar: ${Object.entries(stats.sources)
    .map(([s, n]) => `${s}=${n}`)
    .join(", ")}
Top kinds: ${topKinds.map(([k, n]) => `${k}=${n}`).join(", ")}
Audit (admin aksiyonları): ${stats.audit_actions}
Subdomain trafiği: ${Object.entries(stats.pv_by_host as Record<string, number>)
    .map(([h, n]) => `${h}=${n}`)
    .join(", ")}
`.trim();

  // Build summary via Claude Haiku
  const apiKey = process.env.ANTHROPIC_API_KEY;
  let summaryMd = "";
  let model: string | null = null;

  if (apiKey) {
    const prompt = `Sen Özgür'ün haftalık özet editörüsün. Aşağıdaki ham veriden Türkçe, kısa, net bir hafta özeti yaz.

Format (markdown):
- *Hafta Özeti — ${new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}*
- 1 cümlelik manşet
- ## Olanlar — bullet list 4-6 madde, somut, sayılarla
- ## Öne çıkan tema — 1-2 cümle pattern recognition
- ## Sıradaki — 2-3 öneri (ekosistem context'inde, sahte hedef koymadan)

Veri:
${compactInput}`;

    const { callClaude } = await import("@skilldrunk/llm");
    const res = await callClaude({
      apiKey,
      model: "claude-haiku-4-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
      app: "brief",
      route: "/api/cron/weekly",
      userId: owner.id,
      metadata: { kind: "weekly_digest" },
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
    if (res.ok) {
      summaryMd =
        (res.data.content?.find((c) => (c as { type: string }).type === "text") as
          | { text?: string }
          | undefined
        )?.text ?? "";
      model = res.model;
    }
  }

  if (!summaryMd) {
    summaryMd = `*Hafta Özeti*\n\nToplam: ${stats.events_total} event, ${stats.pv_total} pageview, ${stats.briefs_count} günlük brief, ${stats.audit_actions} admin aksiyonu.\n\nKaynaklar: ${Object.entries(stats.sources)
      .map(([s, n]) => `${s} ${n}`)
      .join(" · ")}`;
  }

  // Push to Telegram
  const text = `${summaryMd}\n\n🔗 https://admin.skilldrunk.com/map`;
  const pushed = await pushToTelegram(text);

  return NextResponse.json({
    ok: true,
    pushed,
    model,
    stats,
    summary_preview: summaryMd.slice(0, 200),
  });
}
