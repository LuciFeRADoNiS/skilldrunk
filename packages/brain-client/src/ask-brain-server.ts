// Server-side askBrain — Faz 4 §1.2 implementation.
// Replaces the FTS-only stub in ask-brain.ts when called from a Node/Edge
// route. Pipeline:
//   1. Resolve realm (auto → domain default).
//   2. Embed query (OpenAI text-embedding-3-small).
//   3. Vector search via brain_search_vector RPC.
//   4. Claude Haiku synthesis (streaming).
//   5. Log usage to sd_ai_usage (best-effort).
//
// Consumers (skilldrunk + skimsoulfat /api/brain/ask routes) wrap this in
// an SSE Response. Keeping streaming logic in the consumer keeps this file
// runtime-agnostic.

import type { BrainSupabase as SupabaseClient } from "./supabase-shim";
import type { BrainItem, Realm } from "./types";

export interface AskBrainServerOpts {
  query: string;
  realm?: Realm | "auto";
  domain?: "skilldrunk" | "skimsoulfat";
  limit?: number;
  openaiKey: string;
  anthropicKey: string;
  supabase: SupabaseClient;
  /** Optional override; defaults to claude-haiku-4-5-20251001 (D-018). */
  haikuModel?: string;
}

export interface AskBrainStreamChunk {
  type: "sources" | "delta" | "done" | "error";
  sources?: BrainItem[];
  delta?: string;
  usage?: {
    embed_tokens: number;
    haiku_input_tokens: number;
    haiku_output_tokens: number;
    cost_usd: number;
  };
  error?: string;
}

const EMBED_MODEL = "text-embedding-3-small";
const EMBED_PER_M = 0.02;
const HAIKU_INPUT_PER_M = 1.0;
const HAIKU_OUTPUT_PER_M = 5.0;

function resolveRealm(opts: AskBrainServerOpts): Realm {
  if (opts.realm && opts.realm !== "auto") return opts.realm;
  if (opts.domain === "skilldrunk") return "work";
  if (opts.domain === "skimsoulfat") return "personal";
  return "shared";
}

function systemPrompt(realm: Realm): string {
  return realm === "personal"
    ? `Sen kişisel beyninim. Gözlemsel, sakin, "sen" hitabıyla yanıtla. Türkçe. Verilen kaynaklar dışına çıkma; bulamazsan "kayıtlarda yok" de.`
    : `Sen iş beyninim. Net, sayısal, profesyonel yanıtla. Türkçe, max 4 cümle. Verilen kaynaklar dışına çıkma; bulamazsan "kayıtlarda yok" de.`;
}

function composeContext(query: string, sources: BrainItem[]): string {
  const items = sources
    .map(
      (s, i) =>
        `[${i + 1}] ${s.title}${s.subtitle ? " — " + s.subtitle : ""}${
          s.description ? "\n    " + s.description.slice(0, 240) : ""
        }`,
    )
    .join("\n");
  return `Soru: ${query}\n\nKaynaklar:\n${items}`;
}

async function embedQuery(
  key: string,
  text: string,
): Promise<{ embedding: number[]; tokens: number }> {
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 8000) }),
  });
  if (!r.ok) throw new Error(`embed ${r.status}: ${await r.text().catch(() => "")}`);
  const json = (await r.json()) as {
    data: Array<{ embedding: number[] }>;
    usage: { total_tokens: number };
  };
  return { embedding: json.data[0].embedding, tokens: json.usage.total_tokens };
}

/**
 * Async generator — yields stream chunks the consumer can convert to SSE.
 * Throws on hard failure; consumer should `try/catch` and emit error chunk.
 */
export async function* askBrainServer(
  opts: AskBrainServerOpts,
): AsyncGenerator<AskBrainStreamChunk> {
  const realm = resolveRealm(opts);
  const limit = opts.limit ?? 8; // D-034 default

  // 1. Embed query
  const { embedding, tokens: embedTokens } = await embedQuery(
    opts.openaiKey,
    opts.query,
  );

  // 2. Vector search
  const { data: searchData, error: searchErr } = await opts.supabase.rpc(
    "brain_search_vector",
    {
      p_embedding: embedding,
      p_realm: realm === "shared" ? null : realm,
      p_limit: limit,
    },
  );
  if (searchErr) throw new Error(`vector search: ${(searchErr as Error).message}`);
  const sources = (searchData ?? []) as BrainItem[];

  yield { type: "sources", sources };

  if (sources.length === 0) {
    yield {
      type: "delta",
      delta: "Kayıtlarda eşleşen kaynak yok. Daha geniş bir soruyla dene veya katalog'a item ekle.",
    };
    yield {
      type: "done",
      usage: {
        embed_tokens: embedTokens,
        haiku_input_tokens: 0,
        haiku_output_tokens: 0,
        cost_usd: (embedTokens * EMBED_PER_M) / 1_000_000,
      },
    };
    return;
  }

  // 3. Haiku stream
  const model = opts.haikuModel ?? "claude-haiku-4-5-20251001";
  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": opts.anthropicKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 800,
      stream: true,
      system: systemPrompt(realm),
      messages: [{ role: "user", content: composeContext(opts.query, sources) }],
    }),
  });
  if (!claudeRes.ok || !claudeRes.body) {
    throw new Error(
      `haiku ${claudeRes.status}: ${await claudeRes.text().catch(() => "")}`,
    );
  }

  const reader = claudeRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let haikuInputTokens = 0;
  let haikuOutputTokens = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // SSE parse — Anthropic emits "event: ...\ndata: {...}\n\n"
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const ev of events) {
      const dataLine = ev.split("\n").find((l) => l.startsWith("data: "));
      if (!dataLine) continue;
      try {
        const payload = JSON.parse(dataLine.slice(6));
        if (payload.type === "content_block_delta" && payload.delta?.text) {
          yield { type: "delta", delta: payload.delta.text };
        } else if (payload.type === "message_start" && payload.message?.usage) {
          haikuInputTokens = payload.message.usage.input_tokens ?? 0;
        } else if (payload.type === "message_delta" && payload.usage) {
          haikuOutputTokens = payload.usage.output_tokens ?? haikuOutputTokens;
        }
      } catch {
        // skip malformed line
      }
    }
  }

  const cost =
    (embedTokens * EMBED_PER_M) / 1_000_000 +
    (haikuInputTokens * HAIKU_INPUT_PER_M) / 1_000_000 +
    (haikuOutputTokens * HAIKU_OUTPUT_PER_M) / 1_000_000;

  // Best-effort usage log (don't fail the response on log error)
  try {
    await opts.supabase.from("sd_ai_usage").insert({
      app: "brain-ask",
      route: `/api/brain/ask?realm=${realm}`,
      model,
      input_tokens: haikuInputTokens,
      output_tokens: haikuOutputTokens,
      cost_usd: cost,
      duration_ms: 0,
      status: "ok",
      metadata: { sources_count: sources.length, embed_tokens: embedTokens },
    });
  } catch {
    // swallow
  }

  yield {
    type: "done",
    usage: {
      embed_tokens: embedTokens,
      haiku_input_tokens: haikuInputTokens,
      haiku_output_tokens: haikuOutputTokens,
      cost_usd: cost,
    },
  };
}
