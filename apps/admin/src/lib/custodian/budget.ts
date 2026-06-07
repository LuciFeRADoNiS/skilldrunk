import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Custodian budget guard + audit logger — Faz 2.
 *
 * Daily hard cap (CUSTODIAN_DAILY_BUDGET_USD, default 2) computed from
 * cst_audit.cost_usd sum for today. When exceeded, the chat disables tools
 * and warns. Every tool call (read + action) is logged to cst_audit.
 *
 * Server-only (service role). See CUSTODIAN-HANDOFF.md.
 */

export const DEFAULT_DAILY_BUDGET_USD = 2;

export function dailyBudgetUsd(): number {
  const raw = process.env.CUSTODIAN_DAILY_BUDGET_USD;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DAILY_BUDGET_USD;
}

export function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export interface BudgetStatus {
  spent_usd: number;
  cap_usd: number;
  remaining_usd: number;
  exceeded: boolean;
}

/** Sum today's cst_audit cost for a domain. */
export async function checkDailyBudget(
  supabase: SupabaseClient,
  domain = "skilldrunk.com",
): Promise<BudgetStatus> {
  const cap = dailyBudgetUsd();
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("cst_audit")
    .select("cost_usd")
    .eq("domain", domain)
    .gte("created_at", since.toISOString());

  if (error) {
    // Fail open-but-cautious: report 0 spent so a logging hiccup doesn't
    // brick the chat, but the per-call logUsage will still record costs.
    console.error("[custodian] budget check failed:", error.message);
    return { spent_usd: 0, cap_usd: cap, remaining_usd: cap, exceeded: false };
  }

  const spent = (data ?? []).reduce(
    (sum, r) => sum + Number((r as { cost_usd: number }).cost_usd ?? 0),
    0,
  );
  return {
    spent_usd: Number(spent.toFixed(4)),
    cap_usd: cap,
    remaining_usd: Number(Math.max(0, cap - spent).toFixed(4)),
    exceeded: spent >= cap,
  };
}

export interface AuditInput {
  domain?: string;
  session_id?: string | null;
  tool: string;
  args?: Record<string, unknown>;
  result_summary?: string | null;
  tokens_in?: number;
  tokens_out?: number;
  cost_usd?: number;
}

/** Append a cst_audit row. Best-effort — never throws. */
export async function logAudit(
  supabase: SupabaseClient,
  input: AuditInput,
): Promise<void> {
  try {
    await supabase.from("cst_audit").insert({
      domain: input.domain ?? "skilldrunk.com",
      session_id: input.session_id ?? null,
      tool: input.tool,
      args: input.args ?? {},
      result_summary: input.result_summary ?? null,
      tokens_in: input.tokens_in ?? 0,
      tokens_out: input.tokens_out ?? 0,
      cost_usd: input.cost_usd ?? 0,
    });
  } catch (err) {
    console.error("[custodian] logAudit failed:", err);
  }
}
