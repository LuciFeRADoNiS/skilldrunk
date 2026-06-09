// apps/admin/src/lib/custodian/tools.ts — Faz 2
//
// Custodian tool definitions (Anthropic format) + read/action partition +
// read-tool dispatcher. ACTION tools are NOT executed here — the chat loop
// intercepts them and surfaces an approval card; execution happens in
// /api/custodian/action after user approval (onaysız execute YOK).

import type { SupabaseClient } from "@supabase/supabase-js";
import { listDeployments, getDeploymentEvents } from "./vercel-api";
import { listCommits } from "./github-api";

export const READ_TOOLS = new Set([
  "query_events",
  "query_analytics",
  "vercel_deployments",
  "vercel_logs",
  "github_commits",
]);

export const ACTION_TOOLS = new Set([
  "backlog_add",
  "content_update",
  "trigger_redeploy",
  "revalidate_path",
]);

/** Anthropic tool schema list. */
export const CUSTODIAN_TOOLS = [
  // ─── READ ───
  {
    name: "query_events",
    description:
      "skilldrunk.com olay akışını (cst_events) sorgula: deploy, commit, content, auth, action. En yeniden eskiye.",
    input_schema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["deploy", "commit", "content", "auth", "action"],
          description: "Olay tipi filtresi (opsiyonel)",
        },
        limit: { type: "number", description: "Kaç kayıt (default 20, max 100)" },
      },
    },
  },
  {
    name: "query_analytics",
    description:
      "Günlük GA4 analitiğini (cst_analytics_daily) sorgula: users, pageviews, top_pages, sources. Son N gün.",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "number", description: "Kaç gün geriye (default 7, max 90)" },
      },
    },
  },
  {
    name: "vercel_deployments",
    description: "skilldrunk Vercel projesinin son deploy'larını listele (state, target, commit).",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Kaç deploy (default 10, max 50)" },
      },
    },
  },
  {
    name: "vercel_logs",
    description: "Belirli bir Vercel deployment'ının build/runtime event'lerini getir.",
    input_schema: {
      type: "object",
      properties: {
        deployment_id: { type: "string", description: "Deployment uid (vercel_deployments'tan)" },
        limit: { type: "number", description: "Kaç satır (default 50)" },
      },
      required: ["deployment_id"],
    },
  },
  {
    name: "github_commits",
    description: "skilldrunk repo'sunun main branch'indeki son commit'leri getir.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Kaç commit (default 10, max 50)" },
      },
    },
  },
  // ─── ACTION (onay kapılı — loop'ta execute EDİLMEZ) ───
  {
    name: "backlog_add",
    description:
      "sd_backlog'a yeni iş ekle (onay gerekir). title zorunlu; project + priority opsiyonel.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        project: { type: "string", description: "default 'general'" },
        priority: { type: "number", description: "1 (yüksek) - 5 (düşük), default 3" },
      },
      required: ["title"],
    },
  },
  {
    name: "content_update",
    description:
      "İçerik durumu güncelle (onay gerekir). target: 'skill' (status), 'app' (status|featured|public), 'quote' (add). v1 mevcut RPC'lerle sınırlı.",
    input_schema: {
      type: "object",
      properties: {
        target: { type: "string", enum: ["skill", "app", "quote"] },
        slug: { type: "string", description: "skill/app slug (quote için boş)" },
        field: {
          type: "string",
          enum: ["status", "featured", "public", "add"],
          description: "skill→status; app→status|featured|public; quote→add",
        },
        value: { type: "string", description: "status değeri veya quote için 'metin -- yazar'" },
      },
      required: ["target", "field"],
    },
  },
  {
    name: "trigger_redeploy",
    description:
      "skilldrunk production yeniden deploy tetikle (onay gerekir). Vercel deploy hook.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "revalidate_path",
    description:
      "Marketplace'te bir path'in ISR cache'ini temizle (onay gerekir). Örn '/feed'.",
    input_schema: {
      type: "object",
      properties: { path: { type: "string", description: "örn /feed, /s/[slug]" } },
      required: ["path"],
    },
  },
];

export function readOnlyToolList() {
  return CUSTODIAN_TOOLS.filter((t) => READ_TOOLS.has(t.name));
}

/** Execute a READ tool. ACTION tools never reach here. */
export async function executeReadTool(
  name: string,
  input: Record<string, unknown>,
  supabase: SupabaseClient,
  domain = "skilldrunk.com",
): Promise<unknown> {
  switch (name) {
    case "query_events": {
      const limit = Math.min(100, Number(input.limit ?? 20));
      let q = supabase
        .from("cst_events")
        .select("type, source, payload, actor, created_at")
        .eq("domain", domain)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (input.type) q = q.eq("type", String(input.type));
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data;
    }
    case "query_analytics": {
      const days = Math.min(90, Number(input.days ?? 7));
      const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("cst_analytics_daily")
        .select("date, users, pageviews, top_pages, sources")
        .eq("domain", domain)
        .gte("date", since)
        .order("date", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    }
    case "vercel_deployments":
      return await listDeployments(Number(input.limit ?? 10));
    case "vercel_logs":
      return await getDeploymentEvents(
        String(input.deployment_id),
        Number(input.limit ?? 50),
      );
    case "github_commits":
      return await listCommits(Number(input.limit ?? 10));
    default:
      throw new Error(`bilinmeyen read tool: ${name}`);
  }
}
