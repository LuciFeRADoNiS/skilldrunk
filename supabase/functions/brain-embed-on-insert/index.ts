// supabase/functions/brain-embed-on-insert/index.ts
//
// Deno edge function. Triggered by brain_items INSERT via pg_net webhook
// (see supabase/migrations/0021_brain_vector_search.sql).
//
// Flow:
//   1. Receive { id, text } from trigger.
//   2. Fetch OpenAI embedding (text-embedding-3-small, 1536-dim).
//   3. UPDATE brain_items SET embedding = ... WHERE id = ...
//   4. Best-effort log to sd_ai_usage.
//
// Secrets (supabase secrets set):
//   OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:
//   supabase functions deploy brain-embed-on-insert --no-verify-jwt
//
// Fallback: scripts/embed-backfill.ts (daily Cowork task) catches missed
// embeds (D-037).

// Deno-specific globals; types via @ts-ignore for portability.
// @ts-ignore — Deno.env is available in Supabase edge runtime
declare const Deno: { env: { get(k: string): string | undefined } };

const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

interface RequestBody {
  id?: string;
  text?: string;
}

interface OpenAIEmbedResp {
  data: Array<{ embedding: number[] }>;
  model: string;
  usage: { total_tokens: number; prompt_tokens: number };
}

const PER_M_TOKENS_USD = 0.02;
function costUsd(tokens: number): number {
  return (tokens * PER_M_TOKENS_USD) / 1_000_000;
}

async function embedOne(text: string): Promise<OpenAIEmbedResp> {
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.slice(0, 8000),
    }),
  });
  if (!r.ok) {
    throw new Error(`OpenAI ${r.status}: ${await r.text().catch(() => "")}`);
  }
  return (await r.json()) as OpenAIEmbedResp;
}

async function updateEmbedding(id: string, embedding: number[]): Promise<void> {
  // pgrest patch — embedding column is vector(1536), Supabase accepts JSON array.
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/brain_items?id=eq.${id}`,
    {
      method: "PATCH",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ embedding }),
    },
  );
  if (!r.ok) {
    throw new Error(`Supabase update ${r.status}: ${await r.text().catch(() => "")}`);
  }
}

async function logUsage(args: {
  ok: boolean;
  tokens: number;
  duration_ms: number;
  error?: string;
}): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/sd_ai_usage`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        app: "brain-embed-on-insert",
        route: "edge-function",
        model: "text-embedding-3-small",
        input_tokens: args.tokens,
        output_tokens: 0,
        cost_usd: costUsd(args.tokens),
        duration_ms: args.duration_ms,
        status: args.ok ? "ok" : "error",
        error_message: args.error ?? null,
      }),
    });
  } catch {
    // swallow — logging never breaks main flow
  }
}

// @ts-ignore — Deno.serve
Deno.serve(async (req: Request) => {
  const start = Date.now();
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }
  if (!OPENAI_KEY || !SUPABASE_URL || !SERVICE_KEY) {
    return new Response("missing env (OPENAI_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)", {
      status: 500,
    });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const id = body.id;
  const text = (body.text ?? "").trim();
  if (!id || !text) {
    return new Response("id + text required", { status: 400 });
  }

  try {
    const emb = await embedOne(text);
    const vec = emb.data[0]?.embedding;
    if (!vec) throw new Error("no embedding in response");
    await updateEmbedding(id, vec);
    const ms = Date.now() - start;
    await logUsage({ ok: true, tokens: emb.usage.total_tokens, duration_ms: ms });
    return new Response(
      JSON.stringify({ ok: true, id, tokens: emb.usage.total_tokens, duration_ms: ms }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const ms = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    await logUsage({ ok: false, tokens: 0, duration_ms: ms, error: msg });
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
