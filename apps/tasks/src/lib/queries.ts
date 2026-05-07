import { createServerClient } from "@skilldrunk/supabase/server";

export interface BotHealth {
  bot_name: string;
  last_seen: string | null;
  status: "green" | "yellow" | "red" | "unknown";
  ram_mb: number | null;
  uptime_s: number | null;
  restart_count: number | null;
  last_error: string | null;
  metadata: Record<string, unknown>;
  updated_at: string;
}

export interface CoworkRun {
  id: number;
  task_id: string;
  task_name: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  status: "success" | "failure" | "timeout" | "running";
  output: string | null;
  error: string | null;
  created_at: string;
}

export interface Alert {
  id: number;
  ts: string;
  level: "P0" | "P1" | "P2";
  source: string | null;
  title: string | null;
  message: string | null;
  acked: boolean;
  acked_at: string | null;
  metadata: Record<string, unknown>;
}

export interface CostDay {
  date: string;
  provider: string;
  bot: string;
  input_tokens: number;
  output_tokens: number;
  cache_read: number;
  cache_write: number;
  cost_usd: number;
}

export async function getBotHealth(): Promise<BotHealth[]> {
  const sb = await createServerClient();
  const { data } = await sb
    .schema("tasks_dashboard")
    .from("infra_bot_health")
    .select("*")
    .order("bot_name");
  return (data ?? []) as BotHealth[];
}

export async function getRecentRuns(limit = 50): Promise<CoworkRun[]> {
  const sb = await createServerClient();
  const { data } = await sb
    .schema("tasks_dashboard")
    .from("cowork_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as CoworkRun[];
}

export async function getRecentFailures(limit = 10): Promise<CoworkRun[]> {
  const sb = await createServerClient();
  const { data } = await sb
    .schema("tasks_dashboard")
    .from("cowork_runs")
    .select("*")
    .in("status", ["failure", "timeout"])
    .order("started_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as CoworkRun[];
}

export async function getOpenAlerts(limit = 20): Promise<Alert[]> {
  const sb = await createServerClient();
  const { data } = await sb
    .schema("tasks_dashboard")
    .from("alerts")
    .select("*")
    .eq("acked", false)
    .order("ts", { ascending: false })
    .limit(limit);
  return (data ?? []) as Alert[];
}

export async function getCostThisWeek(): Promise<CostDay[]> {
  const sb = await createServerClient();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  const { data } = await sb
    .schema("tasks_dashboard")
    .from("cost_daily")
    .select("*")
    .gte("date", startDate.toISOString().slice(0, 10))
    .order("date", { ascending: false });
  return (data ?? []) as CostDay[];
}
