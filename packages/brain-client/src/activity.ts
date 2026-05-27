import type { BrainSupabase as SupabaseClient } from "./supabase-shim";
import type { BrainActivity, BrainSource, Realm } from "./types";

export interface LogActivityInput {
  realm: Realm;
  source: BrainSource;
  event_type: string; // free-form: 'commit', 'deploy', 'note_updated', ...
  title: string;
  body?: string | null;
  url?: string | null;
  item_id?: string | null;
  occurred_at?: string; // ISO timestamp; defaults to now
  metadata?: Record<string, unknown>;
}

/**
 * Append a single row to brain_activity.
 * Called by ingestion scripts (vercel webhook handler, github watcher, jax ledger).
 */
export async function logActivity(
  supabase: SupabaseClient,
  input: LogActivityInput,
): Promise<BrainActivity> {
  const { data, error } = await supabase
    .from("brain_activity")
    .insert({
      realm: input.realm,
      source: input.source,
      event_type: input.event_type,
      item_id: input.item_id ?? null,
      title: input.title,
      body: input.body ?? null,
      url: input.url ?? null,
      occurred_at: input.occurred_at ?? new Date().toISOString(),
      metadata: input.metadata ?? {},
    })
    .select()
    .single();
  if (error) throw error;
  return data as BrainActivity;
}
