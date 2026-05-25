import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrainItem } from "./types";

/**
 * Soft-delete a brain item — sets status='archived'.
 * Goes through SECURITY DEFINER RPC because the table has no DELETE RLS policy.
 */
export async function archiveItem(
  supabase: SupabaseClient,
  id: string,
): Promise<BrainItem> {
  const { data, error } = await supabase.rpc("brain_item_archive", {
    p_id: id,
  });
  if (error) throw error;
  return data as BrainItem;
}
