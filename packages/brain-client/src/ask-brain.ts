import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrainItem, Realm } from "./types";

export interface AskBrainOpts {
  realm?: Realm | "auto";
  domain?: "skilldrunk" | "skimsoulfat";
  limit?: number;
}

export interface AskBrainResult {
  answer: string;
  sources: BrainItem[];
  realm_resolved: Realm;
}

/**
 * Stub for Faz 1 — Faz 4 will wire this to /api/brain/ask which uses
 * embedding-based vector search + Claude Haiku synthesis.
 *
 * For now this falls back to FTS search via brain_search so dependent
 * UI can render against a known shape (`searchBrain` results wrapped in
 * an empty `answer`).
 */
export async function askBrain(
  supabase: SupabaseClient,
  query: string,
  opts: AskBrainOpts = {},
): Promise<AskBrainResult> {
  const realm: Realm =
    opts.realm && opts.realm !== "auto"
      ? opts.realm
      : opts.domain === "skilldrunk"
        ? "work"
        : opts.domain === "skimsoulfat"
          ? "personal"
          : "shared";

  const { data, error } = await supabase.rpc("brain_search", {
    p_query: query,
    p_realm: realm === "shared" ? null : realm,
    p_limit: opts.limit ?? 8,
  });
  if (error) throw error;

  return {
    answer:
      "[Faz 4 placeholder] AI sentezi henüz aktif değil — şu an FTS sonuçları döner.",
    sources: (data ?? []) as BrainItem[],
    realm_resolved: realm,
  };
}
