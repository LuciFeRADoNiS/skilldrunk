import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Domain Custodian event logger — Faz 1.
 *
 * Service-role client (RLS bypass). Used by webhook handlers + the admin
 * auth action to append rows to cst_events. Never import this into a client
 * component — service role key must stay server-side.
 *
 * See CUSTODIAN-HANDOFF.md + supabase/migrations/0022_custodian_init.sql.
 */

export type CstEventType =
  | "deploy"
  | "commit"
  | "content"
  | "auth"
  | "action";

export interface LogEventInput {
  type: CstEventType;
  source: string; // 'vercel' | 'github' | 'admin-login' | 'chat' ...
  payload?: Record<string, unknown>;
  actor?: string | null; // email / github login / 'system'
  domain?: string; // default 'skilldrunk.com'
}

function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Append a single cst_events row. Best-effort — returns false on any failure
 * but never throws, so callers (webhooks, auth flow) don't break on logging.
 */
export async function logEvent(input: LogEventInput): Promise<boolean> {
  const supabase = serviceClient();
  if (!supabase) {
    console.warn("[custodian] logEvent: supabase service config missing");
    return false;
  }
  try {
    const { error } = await supabase.from("cst_events").insert({
      domain: input.domain ?? "skilldrunk.com",
      type: input.type,
      source: input.source,
      payload: input.payload ?? {},
      actor: input.actor ?? null,
    });
    if (error) {
      console.error("[custodian] logEvent insert failed:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[custodian] logEvent exception:", err);
    return false;
  }
}
