import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin";
import { composeBrief } from "@/lib/compose";
import { pushToTelegram } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 90;

/**
 * GET /api/cron — invoked by Vercel Cron every morning.
 * Generates brief for today (summarizing yesterday) for every admin user
 * and pushes to Telegram if configured.
 *
 * Protected by Vercel's CRON_SECRET header (auto-added when cron runs via Vercel).
 */
export async function GET(req: NextRequest) {
  // Vercel Cron adds Authorization: Bearer <CRON_SECRET>
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "admin_client_missing" }, { status: 500 });
  }

  // Find all admin users (owners)
  const { data: admins, error: adminsErr } = await admin
    .from("sd_profiles")
    .select("id")
    .eq("role", "admin");
  if (adminsErr || !admins?.length) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const results: Array<{
    user_id: string;
    status: string;
    pushed?: boolean;
  }> = [];

  for (const a of admins) {
    try {
      // Skip if brief already exists for today
      const { data: existing } = await admin
        .from("br_briefings")
        .select("id")
        .eq("user_id", a.id)
        .eq("brief_date", today)
        .maybeSingle();
      if (existing) {
        results.push({ user_id: a.id, status: "skipped_existing" });
        continue;
      }

      const brief = await composeBrief(admin, a.id, today);

      const { data: inserted } = await admin
        .from("br_briefings")
        .upsert(
          {
            user_id: a.id,
            brief_date: today,
            model: brief.model,
            summary: brief.summary,
            body_md: brief.body_md,
            metadata: brief.metadata,
          },
          { onConflict: "user_id,brief_date" },
        )
        .select("id")
        .single();

      const text = `*Brief — ${today}*\n${brief.summary}\n\n${brief.body_md}\n\n🔗 https://brief.skilldrunk.com/daily/${today}`;
      const pushed = await pushToTelegram(text);
      if (pushed && inserted?.id) {
        await admin
          .from("br_briefings")
          .update({ pushed_at: new Date().toISOString() })
          .eq("id", inserted.id);
      }

      results.push({ user_id: a.id, status: "generated", pushed });
    } catch (err) {
      results.push({ user_id: a.id, status: `error: ${String(err)}` });
    }
  }

  return NextResponse.json({ ok: true, date: today, results });
}
