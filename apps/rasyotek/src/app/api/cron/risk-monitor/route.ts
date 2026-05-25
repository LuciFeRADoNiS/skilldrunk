import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * GET /api/cron/risk-monitor — daily 07:00.
 * Checks:
 * 1) Days remaining to 8 June meeting → push reminder if ≤ 7 days
 * 2) Active risks with score ≥ 12 → daily summary
 * 3) Notes added in last 24h → "yesterday recap"
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sb = adminClient();
  const now = new Date();
  const meetingDate = new Date("2026-06-08T14:00:00+03:00");
  const daysLeft = Math.ceil(
    (meetingDate.getTime() - now.getTime()) / 86400000,
  );

  // Skip if meeting passed long ago
  if (daysLeft < -30) {
    return NextResponse.json({ ok: true, status: "meeting_long_passed" });
  }

  // Active high-priority risks
  const { data: highRisks } = await sb
    .from("rt_risks")
    .select("risk_key,scenario_title,score,status,priority")
    .gte("score", 12)
    .in("status", ["active", "monitoring"])
    .order("score", { ascending: false });

  // Notes added in last 24h
  const yesterdayISO = new Date(Date.now() - 86400000).toISOString();
  const { data: recentNotes } = await sb
    .from("rt_notes")
    .select("id,note_type,title,body_md,created_at")
    .gte("created_at", yesterdayISO)
    .order("created_at", { ascending: false });

  const lines: string[] = [];
  lines.push(`*🎯 Rasyotek Brief — ${now.toISOString().slice(0, 10)}*`);
  lines.push("");

  if (daysLeft > 0 && daysLeft <= 14) {
    lines.push(`📅 *${daysLeft} gün* kaldı: 8 Haziran 14:00 toplantısı`);
    if (daysLeft <= 5) {
      lines.push(`⚠️ Adnan 1:1 alignment için son şans!`);
    }
    lines.push("");
  } else if (daysLeft === 0) {
    lines.push(`🚨 *BUGÜN TOPLANTI!* 14:00`);
    lines.push("");
  }

  if (highRisks && highRisks.length > 0) {
    lines.push(`*Yüksek Riskler (skor ≥12)*`);
    for (const r of highRisks.slice(0, 5)) {
      const emoji =
        r.priority === "red" ? "🔴" : r.priority === "orange" ? "🟠" : "🟡";
      lines.push(`${emoji} ${r.risk_key}: ${r.scenario_title} (${r.score})`);
    }
    lines.push("");
  }

  if (recentNotes && recentNotes.length > 0) {
    lines.push(`*Son 24 Saat (${recentNotes.length} not)*`);
    for (const n of recentNotes.slice(0, 3)) {
      const preview =
        n.title || n.body_md.split("\n")[0].slice(0, 80) + "...";
      lines.push(`• [${n.note_type}] ${preview}`);
    }
    lines.push("");
  }

  lines.push(`🔗 https://rasyotek.skilldrunk.com`);

  const text = lines.join("\n");

  let pushed = false;
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text,
            parse_mode: "Markdown",
            disable_web_page_preview: true,
          }),
        },
      );
      pushed = res.ok;
    } catch (e) {
      console.error("telegram push failed", e);
    }
  }

  return NextResponse.json({
    ok: true,
    days_left: daysLeft,
    high_risks: highRisks?.length ?? 0,
    recent_notes: recentNotes?.length ?? 0,
    pushed,
    text,
  });
}
