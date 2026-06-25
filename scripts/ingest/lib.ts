// Shared helpers for brain_* ingestion scripts.
// Each script targets one source (vercel/github/obsidian/admin) and upserts
// into brain_items via service-role Supabase client. On Cowork scheduled task
// rails — see Projects/Dual-Brain-Web/04-catalog-strategy.md §2.

// D-027: Node v25 + tsx 4.21 named-import interop crash workaround.
// `import { createClient } from "@supabase/supabase-js"` resolves to undefined
// at runtime (named call against a CJS default-export namespace). Pull through
// namespace + fall back to .default for ESM-style exposure.
import * as supabaseJs from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrainKind, BrainSource, Realm } from "@skilldrunk/brain-client";

type CreateClientFn = typeof supabaseJs.createClient;
const createClient: CreateClientFn =
  ((supabaseJs as unknown as { createClient?: CreateClientFn }).createClient ??
    (supabaseJs as unknown as { default?: { createClient?: CreateClientFn } })
      .default?.createClient) as CreateClientFn;

if (!createClient) {
  throw new Error(
    "supabase-js createClient interop broken — check @supabase/supabase-js version",
  );
}

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  GITHUB_TOKEN?: string;
  VERCEL_TOKEN?: string;
  VERCEL_TEAM_ID?: string;
}

export function loadEnv(): Env {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars",
    );
  }
  return {
    SUPABASE_URL: url,
    SUPABASE_SERVICE_ROLE_KEY: key,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    VERCEL_TOKEN:
      process.env.VERCEL_TOKEN ?? process.env.VERCEL_API_TOKEN,
    VERCEL_TEAM_ID:
      process.env.VERCEL_TEAM_ID ?? "team_FIWBic9LwfGzRkAT5QfXkZtA",
  };
}

export function makeSupabase(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

/**
 * Realm guess from project/repo/folder name.
 *
 * Rules (D-003, 04-catalog-strategy §2.1):
 *   work       — skilldrunk-*, enco*, movetech*, encolay*, futurecode*, lestat*
 *   personal   — skimsoulfat*, jax*, radyo*, bday*, sub*, suno*
 *   shared     — everything else (manual review in admin form flips to right realm)
 */
export function guessRealmFromName(name: string): Realm {
  const n = name.toLowerCase();
  if (
    n.startsWith("skilldrunk") ||
    n.startsWith("enco") ||
    n.startsWith("movetech") ||
    n.startsWith("encolay") ||
    n.startsWith("futurecode") ||
    n.startsWith("lestat") ||
    n.startsWith("daimler")
  ) {
    return "work";
  }
  if (
    n.startsWith("skimsoulfat") ||
    n.startsWith("jax") ||
    n.startsWith("radyo") ||
    n.startsWith("bday") ||
    n.startsWith("sub") ||
    n.startsWith("suno") ||
    n.startsWith("birthday")
  ) {
    return "personal";
  }
  return "shared";
}

export function visibilityFromRealm(realm: Realm): {
  visible_skilldrunk: boolean;
  visible_skimsoulfat: boolean;
} {
  return {
    visible_skilldrunk: realm === "work" || realm === "shared",
    visible_skimsoulfat: realm === "personal" || realm === "shared",
  };
}

export interface BrainItemUpsert {
  source: BrainSource;
  external_id: string;
  realm: Realm;
  kind: BrainKind;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  category?: string | null;
  url?: string | null;
  cover_url?: string | null;
  icon_url?: string | null;
  status?: "active" | "broken" | "draft" | "archived";
  metadata?: Record<string, unknown>;
}

/**
 * Idempotent upsert keyed on (source, external_id).
 * Visibility flags derived from realm so callers don't have to repeat.
 */
export async function upsertItem(
  supabase: SupabaseClient,
  item: BrainItemUpsert,
): Promise<void> {
  const visibility = visibilityFromRealm(item.realm);
  const { error } = await supabase
    .from("brain_items")
    .upsert(
      {
        ...item,
        ...visibility,
        last_synced_at: new Date().toISOString(),
        metadata: item.metadata ?? {},
      },
      { onConflict: "source,external_id" },
    );
  if (error) {
    throw new Error(`upsert ${item.source}/${item.external_id}: ${error.message}`);
  }
}

/** Pretty-print stats after each ingest run. */
export function logRunSummary(name: string, ok: number, skipped: number, failed: number): void {
  const parts = [`✓ ${ok}`, skipped ? `~ ${skipped} skipped` : null, failed ? `✗ ${failed} failed` : null]
    .filter(Boolean)
    .join("  ");
  console.log(`[ingest-${name}] ${parts}`);
}
