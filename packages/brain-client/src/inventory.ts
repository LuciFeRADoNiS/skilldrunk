import type { SupabaseClient } from "@supabase/supabase-js";
import type { InventoryReport } from "./types";

/**
 * Health snapshot — items per source/realm/status, stale items (>7d),
 * embedding coverage. Used by /ops dashboards and CI smoke tests.
 */
export async function fetchInventory(
  supabase: SupabaseClient,
): Promise<InventoryReport> {
  const { data, error } = await supabase.rpc("brain_inventory_check");
  if (error) throw error;
  return data as InventoryReport;
}
