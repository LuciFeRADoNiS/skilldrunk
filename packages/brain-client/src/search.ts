import type { BrainSupabase as SupabaseClient } from "./supabase-shim";
import type { BrainItem, Realm } from "./types";

export interface SearchBrainOpts {
  realm?: Realm | null;
  limit?: number;
}

/**
 * FTS + trigram fallback search across title/subtitle/description/category.
 * Vector-based semantic search arrives in Faz 4 as `searchBrainVector`.
 */
export async function searchBrain(
  supabase: SupabaseClient,
  query: string,
  opts: SearchBrainOpts = {},
): Promise<BrainItem[]> {
  const { data, error } = await supabase.rpc("brain_search", {
    p_query: query,
    p_realm: opts.realm ?? null,
    p_limit: opts.limit ?? 20,
  });
  if (error) throw error;
  return (data ?? []) as BrainItem[];
}
