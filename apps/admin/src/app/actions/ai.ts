"use server";

import { createServerClient } from "@skilldrunk/supabase/server";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type AskResult =
  | { ok: true; answer: string; model: string }
  | { ok: false; error: string };

async function adminSupabase() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");
  const { data: profile } = await supabase
    .from("sd_profiles")
    .select("role, username, display_name")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("not_authorized");
  return { supabase, user, profile };
}

type AppRow = {
  slug: string;
  title: string;
  tagline: string | null;
  category: string;
  status: string;
  url: string;
  subdomain: string | null;
  stack: string[];
  tags: string[];
  is_public: boolean;
};

type EcosystemStats = {
  total_skills: number;
  total_users: number;
  total_votes: number;
  total_comments: number;
  total_arena_matches: number;
  open_reports: number;
  pageviews_today: number;
  pageviews_7d: number;
};

async function buildSystemPrompt(): Promise<string> {
  const { supabase, profile } = await adminSupabase();

  const [{ data: apps }, { data: statsData }] = await Promise.all([
    supabase
      .from("pt_apps")
      .select(
        "slug, title, tagline, category, status, url, subdomain, stack, tags, is_public",
      )
      .neq("status", "archived")
      .order("category")
      .returns<AppRow[]>(),
    supabase.rpc("sd_admin_stats"),
  ]);

  const stats = statsData as EcosystemStats | null;

  const appsList = (apps ?? [])
    .map((a) => {
      const vis = a.is_public ? "public" : "private";
      const sub = a.subdomain ? `${a.subdomain}.skilldrunk.com` : "no-subdomain";
      const stack = a.stack.join(", ") || "(no stack)";
      return `- **${a.title}** (\`${a.slug}\`, ${a.category}/${a.status}, ${vis}) → ${a.url} [${sub}] — ${a.tagline ?? "(no tagline)"}. Stack: ${stack}. Tags: ${a.tags.join(", ")}.`;
    })
    .join("\n");

  const statsStr = stats
    ? `Skills: ${stats.total_skills}, Users: ${stats.total_users}, Votes: ${stats.total_votes}, Comments: ${stats.total_comments}, Arena matches: ${stats.total_arena_matches}, Open reports: ${stats.open_reports}, Pageviews today/7d: ${stats.pageviews_today}/${stats.pageviews_7d}`
    : "(stats unavailable)";

  return `You are Özgür's ecosystem assistant for **skilldrunk.com** — the "second brain" portal he's building. You live inside the admin panel at admin.skilldrunk.com/ai.

# Current ecosystem (live data as of this session)

Owner: ${profile?.display_name ?? profile?.username ?? "Özgür"} (admin role)

## Live apps
${appsList || "(no apps listed)"}

## Marketplace stats
${statsStr}

## Auth model
- skilldrunk.com: community public, Google OAuth, role=user
- admin/analiz/brief/radyo: owner private, email+pwd login at admin.skilldrunk.com/login, \`.skilldrunk.com\` cookie shared
- quotes, prototip: fully public (no auth)

## Database (Supabase vrgohatarieeguyyhfan)
- sd_* = marketplace tables (skills, arena, votes, comments, reports, notifications, audit_log, pageviews, search_logs, user roles)
- az_* = analiz (events from Obsidian + GitHub)
- br_* = brief (briefings)
- pt_* = apps catalog (pt_apps)

## Tech stack
Next.js 16 (Turbopack) + React 19 + Supabase (Postgres + Auth + RLS + pg_net) + Tailwind 4 + shadcn (marketplace only) + pnpm workspaces.

# Your job
Answer Özgür's questions about his own ecosystem. Be concise, Turkish, sharp.

- When useful, point to specific URLs (admin pages, analiz event types, marketplace routes, etc.). Use absolute URLs: \`https://admin.skilldrunk.com/apps\`, \`https://skilldrunk.com/arena\`, etc.
- If he asks "how do I X" → give the concrete answer based on this ecosystem, not generic advice.
- If he asks about stats → use the data above.
- If the question is outside this ecosystem (e.g., "what's the weather?") → politely redirect back to skilldrunk ekosistemi.
- Never invent apps/URLs/tables that don't exist in the list above.
- Output is rendered as markdown. Short paragraphs, bullets where useful.

Respond only in Turkish.`;
}

export async function askAssistant(
  history: ChatMessage[],
  userMessage: string,
): Promise<AskResult> {
  try {
    const system = await buildSystemPrompt();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        error:
          "ANTHROPIC_API_KEY yok. Vercel → skilldrunk-admin → Settings → Environment → ANTHROPIC_API_KEY ekle.",
      };
    }

    const messages = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: userMessage },
    ];

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        system,
        messages,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const txt = await res.text();
      return {
        ok: false,
        error: `API ${res.status}: ${txt.slice(0, 200)}`,
      };
    }

    const json = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
      model?: string;
    };
    const text =
      json.content?.find((c) => c.type === "text")?.text ?? "(empty response)";

    return { ok: true, answer: text, model: json.model ?? "claude-haiku-4-5" };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
