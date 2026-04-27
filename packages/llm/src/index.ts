import { createClient } from "@supabase/supabase-js";

/**
 * Anthropic API pricing — per 1M tokens, USD.
 * Update when models/prices change. Unknown models cost $0 (logged but not estimated).
 *
 * Reference: https://www.anthropic.com/pricing
 */
const PRICING: Record<string, { input: number; output: number }> = {
  // Claude 4.x family — adjust as Anthropic updates
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
  "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0 },
  "claude-sonnet-4-5": { input: 3.0, output: 15.0 },
  "claude-sonnet-4-5-20250929": { input: 3.0, output: 15.0 },
  "claude-opus-4-5": { input: 15.0, output: 75.0 },
  // Older fallbacks
  "claude-haiku-3-5": { input: 0.8, output: 4.0 },
  "claude-sonnet-3-5": { input: 3.0, output: 15.0 },
  "claude-opus-3": { input: 15.0, output: 75.0 },
};

export type AnthropicMessage = {
  role: "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
};

export type CallClaudeOpts = {
  apiKey: string;
  model: string;
  messages: AnthropicMessage[];
  system?: string;
  tools?: Array<Record<string, unknown>>;
  max_tokens?: number;
  timeoutMs?: number;

  // Tracking
  app: string; // 'brief' | 'quotes' | 'admin-ai' | 'marketplace-find'
  route?: string;
  userId?: string | null;
  metadata?: Record<string, unknown>;

  // Logging — pass these to enable tracking. Service role used to bypass RLS.
  supabaseUrl?: string;
  supabaseServiceKey?: string;
};

export type ClaudeUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
};

export type ClaudeResponseShape = {
  id?: string;
  model?: string;
  content?: Array<Record<string, unknown>>;
  stop_reason?: string;
  usage?: ClaudeUsage;
};

export type CallClaudeResult =
  | {
      ok: true;
      data: ClaudeResponseShape;
      usage: ClaudeUsage;
      cost_usd: number;
      duration_ms: number;
      model: string;
    }
  | {
      ok: false;
      error: string;
      status?: number;
      duration_ms: number;
    };

export function computeCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = PRICING[model];
  if (!p) return 0;
  // Rates are per million tokens
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

/**
 * Single entry point for all Claude API calls in the skilldrunk ecosystem.
 * Auto-logs to sd_ai_usage if supabase creds provided.
 */
export async function callClaude(opts: CallClaudeOpts): Promise<CallClaudeResult> {
  const start = Date.now();
  const timeout = opts.timeoutMs ?? 45_000;

  let res: Response | null = null;
  let body: ClaudeResponseShape | null = null;
  let errMsg: string | null = null;
  let httpStatus: number | undefined;

  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": opts.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: opts.model,
        max_tokens: opts.max_tokens ?? 1024,
        ...(opts.system ? { system: opts.system } : {}),
        ...(opts.tools ? { tools: opts.tools } : {}),
        messages: opts.messages,
      }),
      signal: AbortSignal.timeout(timeout),
    });
    httpStatus = res.status;

    if (!res.ok) {
      const text = await res.text();
      errMsg = `${res.status}: ${text.slice(0, 300)}`;
    } else {
      body = (await res.json()) as ClaudeResponseShape;
    }
  } catch (err) {
    errMsg = err instanceof Error ? err.message : String(err);
  }

  const duration_ms = Date.now() - start;

  // Log usage (fire-and-forget)
  if (opts.supabaseUrl && opts.supabaseServiceKey) {
    void logUsage({
      url: opts.supabaseUrl,
      key: opts.supabaseServiceKey,
      app: opts.app,
      route: opts.route ?? null,
      model: body?.model ?? opts.model,
      usage: body?.usage,
      cost_usd: body?.usage
        ? computeCost(
            body.model ?? opts.model,
            body.usage.input_tokens ?? 0,
            body.usage.output_tokens ?? 0,
          )
        : 0,
      duration_ms,
      status: errMsg ? "error" : "ok",
      error_message: errMsg,
      user_id: opts.userId ?? null,
      metadata: opts.metadata ?? {},
    });
  }

  if (errMsg || !body) {
    return {
      ok: false,
      error: errMsg ?? "no_body",
      status: httpStatus,
      duration_ms,
    };
  }

  const usage = body.usage ?? { input_tokens: 0, output_tokens: 0 };
  const cost_usd = computeCost(
    body.model ?? opts.model,
    usage.input_tokens ?? 0,
    usage.output_tokens ?? 0,
  );

  return {
    ok: true,
    data: body,
    usage,
    cost_usd,
    duration_ms,
    model: body.model ?? opts.model,
  };
}

async function logUsage(args: {
  url: string;
  key: string;
  app: string;
  route: string | null;
  model: string;
  usage?: ClaudeUsage;
  cost_usd: number;
  duration_ms: number;
  status: string;
  error_message: string | null;
  user_id: string | null;
  metadata: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = createClient(args.url, args.key, {
      auth: { persistSession: false },
    });
    await supabase.from("sd_ai_usage").insert({
      app: args.app,
      route: args.route,
      model: args.model,
      input_tokens: args.usage?.input_tokens ?? 0,
      output_tokens: args.usage?.output_tokens ?? 0,
      cache_read_input_tokens: args.usage?.cache_read_input_tokens ?? 0,
      cache_creation_input_tokens:
        args.usage?.cache_creation_input_tokens ?? 0,
      cost_usd: args.cost_usd,
      duration_ms: args.duration_ms,
      status: args.status,
      error_message: args.error_message,
      user_id: args.user_id,
      metadata: args.metadata,
    });
  } catch {
    // Silent — never let logging break user requests
  }
}
