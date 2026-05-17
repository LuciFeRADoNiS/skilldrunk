import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/backlog/export.md
 *
 * Returns the active backlog as a Markdown document. Used by Cowork session's
 * scheduled task to mirror the canonical DB list into the Obsidian vault
 * (Personal Brain/Backlog/skilldrunk.md), giving offline + searchable access.
 *
 * Auth: requires ?secret=<CRON_SECRET> matching env. We intentionally do not
 * use the admin login cookie here so cron daemons can hit it without a session.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new Response("CRON_SECRET not configured", { status: 500 });
  }
  const got = req.nextUrl.searchParams.get("secret");
  if (got !== secret) {
    return new Response("unauthorized", { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return new Response("supabase env missing", { status: 500 });
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from("sd_backlog")
    .select(
      "id, title, body_md, project, status, priority, source, assignee, tags, created_at, updated_at, completed_at",
    )
    .order("status", { ascending: true })
    .order("priority", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    return new Response(`# error\n\n${error.message}\n`, {
      status: 500,
      headers: { "content-type": "text/markdown; charset=utf-8" },
    });
  }

  const rows = (data ?? []) as Array<{
    id: number;
    title: string;
    body_md: string | null;
    project: string;
    status: string;
    priority: number;
    source: string;
    assignee: string | null;
    tags: string[] | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
  }>;

  const byStatus = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!byStatus.has(r.status)) byStatus.set(r.status, []);
    byStatus.get(r.status)!.push(r);
  }

  const STATUS_ORDER = [
    "in_progress",
    "next",
    "blocked",
    "idea",
    "done",
    "wontfix",
  ];
  const STATUS_LABELS: Record<string, string> = {
    in_progress: "▶ Devam Eden",
    next: "• Sırada",
    blocked: "⏸ Engelli",
    idea: "💡 Fikirler",
    done: "✅ Bitti",
    wontfix: "🗑 İptal",
  };

  let md = `---\ntype: backlog-mirror\nsource: skilldrunk-supabase\nupdated: ${new Date().toISOString()}\nupstream: https://admin.skilldrunk.com/backlog\nnote: "Read-only mirror. DO NOT edit — değişiklikler admin.skilldrunk.com/backlog'tan veya @skilldrunk_bot /todo /done komutlarıyla yapılır."\n---\n\n# Backlog — Tek Havuz\n\n_Son senkron: ${new Date().toISOString().slice(0, 16).replace("T", " ")}_\n\n`;

  for (const status of STATUS_ORDER) {
    const items = byStatus.get(status) ?? [];
    if (items.length === 0) continue;
    md += `\n## ${STATUS_LABELS[status] ?? status} (${items.length})\n\n`;
    for (const r of items) {
      const checkbox = r.status === "done" ? "x" : " ";
      const tags = (r.tags ?? []).map((t) => `#${t}`).join(" ");
      const meta = [
        `P${r.priority}`,
        `\`${r.project}\``,
        r.assignee && r.assignee !== "shared" ? `@${r.assignee}` : null,
        tags || null,
      ]
        .filter(Boolean)
        .join(" · ");
      md += `- [${checkbox}] **#${r.id}** ${r.title}\n  ${meta}\n`;
      if (r.body_md && r.body_md.trim()) {
        md += `  > ${r.body_md.replace(/\n/g, "\n  > ")}\n`;
      }
    }
  }

  md += `\n---\n\n_${rows.length} kayıt · admin.skilldrunk.com/backlog_\n`;

  return new Response(md, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
