import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrainItem, Domain } from "./types";

export interface FetchCatalogOpts {
  domain: Domain;
  category?: string | null;
  limit?: number;
  offset?: number;
}

/**
 * Server-shuffled catalog feed for the /catalog page.
 * Each call returns a different order (D-004) — set Cache-Control: no-store
 * on the route that uses this.
 */
export async function fetchCatalog(
  supabase: SupabaseClient,
  opts: FetchCatalogOpts,
): Promise<BrainItem[]> {
  const { data, error } = await supabase.rpc("brain_catalog_shuffle", {
    p_domain: opts.domain,
    p_category: opts.category ?? null,
    p_limit: opts.limit ?? 24,
    p_offset: opts.offset ?? 0,
  });
  if (error) throw error;
  return (data ?? []) as BrainItem[];
}
