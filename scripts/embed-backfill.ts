// scripts/embed-backfill.ts
//
// Backfill brain_items.embedding using OpenAI text-embedding-3-small (1536-dim, D-019).
// Batch up to 100 items per call. Logs to sd_ai_usage.
//
// Manual:  pnpm tsx scripts/embed-backfill.ts
// Cowork:  scheduled task `brain-embeddings-backfill` daily 04:00 (D-040 follow-up)
//
// Env: OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { loadEnv as loadBaseEnv, makeSupabase } from "./ingest/lib";

interface OpenAIEmbedResponse {
  data: Array<{ embedding: number[]; index: number }>;
  model: string;
  usage: { prompt_tokens: number; total_tokens: number };
}

const MODEL = "text-embedding-3-small";
const BATCH = 100;

// Per OpenAI pricing 2026-05: $0.02 / 1M tokens (text-embedding-3-small).
const PER_M_TOKENS_USD = 0.02;
function costUsd(tokens: number): number {
  return (tokens * PER_M_TOKENS_USD) / 1_000_000;
}

interface BackfillRow {
  id: string;
  title: string;
  description: string | null;
  subtitle: string | null;
}

function composeText(r: BackfillRow): string {
  return [r.title, r.subtitle ?? "", r.description ?? ""]
    .filter(Boolean)
    .join(" — ")
    .slice(0, 8000); // OpenAI ceiling ~8191 tokens; chars is conservative.
}

async function fetchEmbeddings(
  apiKey: string,
  inputs: string[],
): Promise<OpenAIEmbedResponse> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, input: inputs }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${await res.text().catch(() => "")}`);
  }
  return (await res.json()) as OpenAIEmbedResponse;
}

export async function backfillEmbeddings(): Promise<{
  scanned: number;
  embedded: number;
  failed: number;
  total_cost_usd: number;
}> {
  const env = loadBaseEnv();
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new Error("OPENAI_API_KEY missing (D-019 zorunlu)");
  const supabase = makeSupabase(env);

  let scanned = 0;
  let embedded = 0;
  let failed = 0;
  let costSum = 0;

  // Cursor-paginate by id to handle large datasets idempotently.
  let lastId: string | null = null;
  while (true) {
    let q = supabase
      .from("brain_items")
      .select("id, title, subtitle, description")
      .is("embedding", null)
      .order("id", { ascending: true })
      .limit(BATCH);
    if (lastId) q = q.gt("id", lastId);

    const { data, error } = await q;
    if (error) throw new Error(`fetch missing-embedding rows: ${error.message}`);
    const rows = (data ?? []) as BackfillRow[];
    if (rows.length === 0) break;

    scanned += rows.length;
    lastId = rows[rows.length - 1].id;
    const inputs = rows.map(composeText);

    try {
      const emb = await fetchEmbeddings(openaiKey, inputs);
      // OpenAI returns data[] in same order as input; map by index.
      const updates = rows.map((r, i) => ({
        id: r.id,
        embedding: emb.data[i]?.embedding,
      }));
      // Batch UPDATE — Supabase doesn't support bulk UPDATE in one round trip
      // for arbitrary primary keys; chunk individual updates in parallel.
      const results = await Promise.allSettled(
        updates.map((u) =>
          supabase
            .from("brain_items")
            .update({ embedding: u.embedding })
            .eq("id", u.id),
        ),
      );
      const okCount = results.filter((r) => r.status === "fulfilled").length;
      embedded += okCount;
      failed += results.length - okCount;

      const c = costUsd(emb.usage.total_tokens);
      costSum += c;

      // Log to sd_ai_usage (best effort; non-fatal).
      await supabase.from("sd_ai_usage").insert({
        app: "brain-embed-backfill",
        route: "scripts/embed-backfill.ts",
        model: emb.model,
        input_tokens: emb.usage.prompt_tokens,
        output_tokens: 0,
        cost_usd: c,
        duration_ms: 0,
        status: "ok",
        metadata: { batch_size: rows.length, items_ok: okCount },
      });

      console.log(
        `[embed-backfill] batch ${rows.length} ok=${okCount} tokens=${emb.usage.total_tokens} cost=$${c.toFixed(4)}`,
      );
    } catch (err) {
      failed += rows.length;
      console.error(`[embed-backfill] batch failed:`, (err as Error).message);
      // Skip and continue — don't let one batch crash whole run.
    }
  }

  console.log(
    `[embed-backfill] DONE scanned=${scanned} embedded=${embedded} failed=${failed} cost=$${costSum.toFixed(4)}`,
  );
  return { scanned, embedded, failed, total_cost_usd: costSum };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  backfillEmbeddings().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
