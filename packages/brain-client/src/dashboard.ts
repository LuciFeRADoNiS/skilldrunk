import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardPayload, Realm } from "./types";

/**
 * Single-call hydration for the /home dashboard.
 * Returns kpi + today's digest + last 10 activity + 12-item catalog preview + counts.
 */
export async function fetchDashboard(
  supabase: SupabaseClient,
  realm: Realm,
): Promise<DashboardPayload> {
  const { data, error } = await supabase.rpc("brain_dashboard_payload", {
    p_realm: realm,
  });
  if (error) throw error;
  return data as DashboardPayload;
}
