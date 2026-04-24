import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

/**
 * Polls GitHub for the configured user's recent activity and upserts into
 * az_events with source='github'. Idempotent via external_id = event.id.
 *
 * Vercel Cron: every 30 min. Also callable manually with Authorization: Bearer $CRON_SECRET.
 *
 * Env:
 *   GITHUB_TOKEN        — optional PAT; lifts rate-limit from 60/hr to 5000/hr
 *   GITHUB_USERNAME     — required; whose events to pull
 *   GITHUB_TARGET_USER  — required; sd_profiles.id that owns these events
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type GhEvent = {
  id: string;
  type: string;
  created_at: string;
  repo: { name: string };
  actor: { login: string };
  payload: Record<string, unknown>;
};

function hash(v: string) {
  return crypto.createHash("sha256").update(v).digest("hex").slice(0, 32);
}

function extractTitle(ev: GhEvent): string {
  const type = ev.type;
  const repo = ev.repo.name;
  const p = ev.payload as Record<string, any>;

  switch (type) {
    case "PushEvent": {
      const msgs: string[] = (p.commits ?? [])
        .map((c: { message?: string }) => c.message ?? "")
        .filter(Boolean);
      const head = msgs[0]?.split("\n")[0] ?? "push";
      return `${repo} ← ${head}${msgs.length > 1 ? ` (+${msgs.length - 1})` : ""}`;
    }
    case "PullRequestEvent":
      return `${repo} PR #${p.pull_request?.number}: ${p.pull_request?.title ?? "(pr)"} [${p.action}]`;
    case "IssuesEvent":
      return `${repo} #${p.issue?.number}: ${p.issue?.title ?? "(issue)"} [${p.action}]`;
    case "IssueCommentEvent":
      return `${repo} #${p.issue?.number} comment`;
    case "CreateEvent":
      return `${repo} created ${p.ref_type ?? ""} ${p.ref ?? ""}`.trim();
    case "DeleteEvent":
      return `${repo} deleted ${p.ref_type ?? ""} ${p.ref ?? ""}`.trim();
    case "WatchEvent":
      return `⭐ starred ${repo}`;
    case "ForkEvent":
      return `🍴 forked ${repo}`;
    case "ReleaseEvent":
      return `${repo} release ${p.release?.tag_name ?? ""} [${p.action}]`;
    case "PullRequestReviewEvent":
      return `${repo} PR #${p.pull_request?.number} review`;
    default:
      return `${repo} ${type}`;
  }
}

function extractBody(ev: GhEvent): string | null {
  const p = ev.payload as Record<string, any>;
  switch (ev.type) {
    case "PushEvent":
      return ((p.commits ?? []) as Array<{ message?: string }>)
        .map((c) => c.message ?? "")
        .filter(Boolean)
        .slice(0, 5)
        .join("\n")
        .slice(0, 1000);
    case "PullRequestEvent":
      return (p.pull_request?.body as string | undefined)?.slice(0, 1000) ?? null;
    case "IssuesEvent":
      return (p.issue?.body as string | undefined)?.slice(0, 1000) ?? null;
    case "IssueCommentEvent":
      return (p.comment?.body as string | undefined)?.slice(0, 1000) ?? null;
    case "ReleaseEvent":
      return (p.release?.body as string | undefined)?.slice(0, 1000) ?? null;
    default:
      return null;
  }
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ghUser = process.env.GITHUB_USERNAME;
  const targetUserId = process.env.GITHUB_TARGET_USER;
  if (!ghUser || !targetUserId) {
    return NextResponse.json(
      { error: "config_missing", detail: "GITHUB_USERNAME and GITHUB_TARGET_USER required" },
      { status: 500 },
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "supabase_config_missing" }, { status: 500 });
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Fetch GitHub events (last ~100, up to 10 pages of 30 = 300 but 100 is default)
  const ghHeaders: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "skilldrunk-analiz/0.1",
  };
  if (process.env.GITHUB_TOKEN) {
    ghHeaders["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const ghRes = await fetch(
    `https://api.github.com/users/${encodeURIComponent(ghUser)}/events?per_page=100`,
    { headers: ghHeaders, signal: AbortSignal.timeout(20_000) },
  );
  if (!ghRes.ok) {
    return NextResponse.json(
      { error: "github_error", status: ghRes.status, body: (await ghRes.text()).slice(0, 300) },
      { status: 502 },
    );
  }

  const events = (await ghRes.json()) as GhEvent[];
  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, scanned: 0 });
  }

  // Build az_events rows
  const rows = events.map((ev) => {
    const kind = `${ev.type.replace(/Event$/, "").toLowerCase()}:create`;
    const tags = ["github", ev.type.replace(/Event$/, ""), ev.repo.name.split("/")[1] ?? ev.repo.name];
    return {
      user_id: targetUserId,
      source: "github" as const,
      kind,
      title: extractTitle(ev).slice(0, 500),
      body: extractBody(ev),
      tags: Array.from(new Set(tags)).slice(0, 16),
      metadata: {
        repo: ev.repo.name,
        type: ev.type,
        gh_event_id: ev.id,
        url: `https://github.com/${ev.repo.name}`,
      },
      occurred_at: ev.created_at,
      external_id: hash(`github:${ev.id}`),
    };
  });

  const CHUNK = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("az_events")
      .upsert(slice, {
        onConflict: "user_id,source,external_id",
        ignoreDuplicates: true,
      })
      .select("id");
    if (error) {
      return NextResponse.json(
        { error: "upsert_failed", detail: error.message, inserted },
        { status: 500 },
      );
    }
    inserted += data?.length ?? 0;
  }

  return NextResponse.json({
    ok: true,
    scanned: rows.length,
    inserted,
    now: new Date().toISOString(),
  });
}
