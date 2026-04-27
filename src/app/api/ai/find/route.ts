import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SkillType } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Candidate = {
  slug: string;
  title: string;
  summary: string;
  type: SkillType;
  tags: string[];
  score: number;
};

type FinderResult = {
  query: string;
  skills: Array<Candidate & { reasoning?: string }>;
  usedLLM: boolean;
};

/**
 * POST /api/ai/find
 * Body: { query: string, type?: SkillType }
 *
 * Stage 1 (always): Postgres FTS → top 30 candidates
 * Stage 2 (if ANTHROPIC_API_KEY present): Claude reranks + explains top 5
 * Stage 2 fallback: return top 5 from FTS score
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const query =
    typeof (body as { query?: unknown })?.query === "string"
      ? ((body as { query: string }).query ?? "").trim()
      : "";
  const type =
    typeof (body as { type?: unknown })?.type === "string"
      ? ((body as { type: string }).type as SkillType)
      : undefined;

  if (!query) {
    return NextResponse.json({ error: "empty_query" }, { status: 400 });
  }

  const supabase = await createClient();

  // ── Stage 1: Postgres full-text search ──────────────────
  // Convert natural language to a websearch-friendly query (OR between terms)
  const terms = query
    .split(/\s+/)
    .map((t) => t.replace(/[^\w-]/g, ""))
    .filter((t) => t.length > 2)
    .slice(0, 10);
  const fts = terms.join(" OR ") || query;

  let fromQuery = supabase
    .from("sd_skills")
    .select("slug, title, summary, type, tags, score")
    .eq("status", "published")
    .order("score", { ascending: false })
    .limit(30);

  if (type) fromQuery = fromQuery.eq("type", type);

  // Try FTS first, fall back to plain trigram match if FTS parse fails
  const { data: ftsData } = await fromQuery.textSearch("search_vector", fts, {
    type: "websearch",
  });
  let candidates = (ftsData ?? []) as Candidate[];

  // If FTS returned nothing, fall back to fuzzy title/summary match
  if (candidates.length === 0) {
    const needle = `%${query.replace(/[%_]/g, "")}%`;
    const { data: fuzzyData } = await supabase
      .from("sd_skills")
      .select("slug, title, summary, type, tags, score")
      .eq("status", "published")
      .or(`title.ilike.${needle},summary.ilike.${needle}`)
      .order("score", { ascending: false })
      .limit(30);
    candidates = (fuzzyData ?? []) as Candidate[];
  }

  if (candidates.length === 0) {
    return NextResponse.json({
      query,
      skills: [],
      usedLLM: false,
    } satisfies FinderResult);
  }

  // ── Stage 2: Claude Haiku reranking (optional) ──────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      query,
      skills: candidates.slice(0, 5),
      usedLLM: false,
    } satisfies FinderResult);
  }

  const prompt = buildPrompt(query, candidates);
  try {
    const { callClaude } = await import("@skilldrunk/llm");
    const llm = await callClaude({
      apiKey,
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      timeoutMs: 15_000,
      messages: [{ role: "user", content: prompt }],
      app: "marketplace-find",
      route: "/api/ai/find",
      metadata: { query, candidates: candidates.length },
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    });

    if (!llm.ok) {
      console.error("[ai-find] anthropic api error:", llm.error);
      return NextResponse.json({
        query,
        skills: candidates.slice(0, 5),
        usedLLM: false,
      } satisfies FinderResult);
    }

    const text =
      (llm.data.content?.find((c) => (c as { type: string }).type === "text") as
        | { text?: string }
        | undefined
      )?.text ?? "";

    const picks = parseLlmResponse(text, candidates);
    return NextResponse.json({
      query,
      skills: picks.length ? picks : candidates.slice(0, 5),
      usedLLM: picks.length > 0,
    } satisfies FinderResult);
  } catch (err) {
    console.error("[ai-find] llm exception:", err);
    return NextResponse.json({
      query,
      skills: candidates.slice(0, 5),
      usedLLM: false,
    } satisfies FinderResult);
  }
}

function buildPrompt(query: string, candidates: Candidate[]): string {
  const list = candidates
    .slice(0, 30)
    .map(
      (c, i) =>
        `${i + 1}. [${c.type}] ${c.title} (/s/${c.slug}) — ${c.summary}${
          c.tags?.length ? ` [tags: ${c.tags.slice(0, 4).join(", ")}]` : ""
        }`,
    )
    .join("\n");

  return `You are a skill finder for skilldrunk.com, a catalog of AI skills (Claude Skills, MCP servers, Custom GPTs, Cursor rules, prompts, agents).

The user's need: "${query}"

From this candidate list (top 30 by community vote score), pick the 5 BEST matches for the user's need. Be ruthless — quality over quantity. If fewer than 5 genuinely match, return fewer.

Candidates:
${list}

Respond ONLY with a JSON array, no prose, no code fences. Each element:
{"slug": "skill-slug", "reasoning": "one sentence why this fits the user's need"}

Example: [{"slug":"foo-bar","reasoning":"Handles exactly the API testing flow the user described."}]`;
}

function parseLlmResponse(
  text: string,
  candidates: Candidate[],
): Array<Candidate & { reasoning: string }> {
  // Find JSON array — LLM sometimes wraps it
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]) as Array<{
      slug?: string;
      reasoning?: string;
    }>;
    const bySlug = new Map(candidates.map((c) => [c.slug, c]));
    return parsed
      .map((p) => {
        const cand = p.slug ? bySlug.get(p.slug) : null;
        if (!cand) return null;
        return { ...cand, reasoning: p.reasoning ?? "" };
      })
      .filter(
        (x): x is Candidate & { reasoning: string } => x !== null,
      )
      .slice(0, 5);
  } catch {
    return [];
  }
}
