// /api/custodian/chat — Faz 2 PR-D
//
// Domain Custodian chat — Anthropic tool-calling loop.
//   • READ tools execute inline; results fed back to the model.
//   • ACTION tools are NOT executed — intercepted and returned as
//     pendingActions[] for the UI approval cards. Execution happens in
//     /api/custodian/action after the user clicks Onayla (onaysız execute YOK).
//   • Daily budget hard cap (cst_audit cost sum) — exceeded → tools off.
//   • Haiku default; "derin analiz" / escalate flag → Sonnet.
//   • Every LLM turn logged to cst_audit (tokens + cost).

import { NextResponse } from "next/server";
import { createServerClient } from "@skilldrunk/supabase/server";
import {
  CUSTODIAN_TOOLS,
  READ_TOOLS,
  ACTION_TOOLS,
  executeReadTool,
} from "@/lib/custodian/tools";
import {
  serviceClient,
  checkDailyBudget,
  logAudit,
  type BudgetStatus,
} from "@/lib/custodian/budget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HAIKU = "claude-haiku-4-5-20251001";
const SONNET = "claude-sonnet-4-5";
const MAX_TURNS = 6;
const DOMAIN = "skilldrunk.com";

type ChatMessage = { role: "user" | "assistant"; content: string };
interface PendingAction {
  tool: string;
  args: Record<string, unknown>;
  summary: string;
}

function wantsEscalation(messages: ChatMessage[], explicit?: boolean): boolean {
  if (explicit) return true;
  const last = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  return /derin analiz|detaylı incele|deep|kapsamlı/i.test(last);
}

async function buildSystemPrompt(svc: ReturnType<typeof serviceClient>): Promise<string> {
  let ctx = "";
  if (svc) {
    try {
      const since24h = new Date(Date.now() - 86_400_000).toISOString();
      const [{ count: deploys }, { count: commits }, { data: analytics }] = await Promise.all([
        svc.from("cst_events").select("*", { count: "exact", head: true }).eq("type", "deploy").gte("created_at", since24h),
        svc.from("cst_events").select("*", { count: "exact", head: true }).eq("type", "commit").gte("created_at", since24h),
        svc.from("cst_analytics_daily").select("date, users, pageviews").eq("domain", DOMAIN).order("date", { ascending: false }).limit(1),
      ]);
      const a = analytics?.[0];
      ctx = `\n\nBağlam (son 24h): ${deploys ?? 0} deploy, ${commits ?? 0} commit. Son analytics: ${a ? `${a.date} — ${a.users} kullanıcı, ${a.pageviews} pageview` : "yok"}.`;
    } catch {
      /* context best-effort */
    }
  }
  return `Sen skilldrunk.com'un Domain Custodian'ısın — site bekçisi. Deploy, commit, içerik, auth, analytics olaylarını izler; sorulara veriyle cevap verir; gerektiğinde aksiyon ÖNERİRSİN.

Kurallar:
- Türkçe, net, öz yanıtla.
- Veri için read tool'ları kullan (query_events, query_analytics, vercel_deployments, vercel_logs, github_commits). Uydurma.
- Aksiyon tool'ları (backlog_add, content_update, trigger_redeploy, revalidate_path) ÇAĞIRDIĞINDA sistem bunları kullanıcı onayına sunar — sen çalıştırmazsın. Aksiyonu net bir cümleyle gerekçelendir.
- Bir kaynak bulamazsan dürüstçe söyle.${ctx}`;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "ANTHROPIC_API_KEY yok" }, { status: 500 });
  }

  // Auth gate — admin only.
  const cookieSupabase = await createServerClient();
  const {
    data: { user },
  } = await cookieSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "auth required" }, { status: 401 });
  }
  const { data: profile } = await cookieSupabase
    .from("sd_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ ok: false, error: "admin only" }, { status: 403 });
  }

  let body: { messages?: ChatMessage[]; escalate?: boolean; session_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  const history = Array.isArray(body.messages) ? body.messages : [];
  if (history.length === 0) {
    return NextResponse.json({ ok: false, error: "messages required" }, { status: 400 });
  }

  const svc = serviceClient();
  if (!svc) {
    return NextResponse.json({ ok: false, error: "supabase service config eksik" }, { status: 500 });
  }

  // Budget gate — exceeded → no model call.
  const budget: BudgetStatus = await checkDailyBudget(svc, DOMAIN);
  if (budget.exceeded) {
    return NextResponse.json({
      ok: true,
      answer: `⚠️ Günlük custodian bütçesi doldu ($${budget.spent_usd} / $${budget.cap_usd}). Tool'lar yarın 00:00 UTC'de sıfırlanana kadar kapalı. Acil ihtiyaç varsa CUSTODIAN_DAILY_BUDGET_USD env'ini artır.`,
      pendingActions: [],
      budget,
      model: null,
      traces: [],
    });
  }

  const model = wantsEscalation(history, body.escalate) ? SONNET : HAIKU;
  const system = await buildSystemPrompt(svc);

  const { callClaude } = await import("@skilldrunk/llm");
  type AnthropicContent = {
    type: string;
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
  };
  const messages: Array<{ role: string; content: unknown }> = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const pendingActions: PendingAction[] = [];
  const traces: Array<{ name: string; ok: boolean }> = [];
  let finalText = "";
  let turnCostTotal = 0;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const callRes = await callClaude({
      apiKey,
      model,
      max_tokens: 2048,
      system,
      tools: CUSTODIAN_TOOLS as Array<Record<string, unknown>>,
      messages: messages as never,
      app: "custodian",
      route: "/api/custodian/chat",
      userId: user.id,
      metadata: { turn, model },
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
    if (!callRes.ok) {
      return NextResponse.json({ ok: false, error: callRes.error }, { status: 502 });
    }

    const json = callRes.data as unknown as {
      content: AnthropicContent[];
      stop_reason: string;
    };
    turnCostTotal += callRes.cost_usd ?? 0;

    // Audit this turn (tokens + cost where they actually accrue).
    await logAudit(svc, {
      domain: DOMAIN,
      session_id: body.session_id ?? null,
      tool: "chat-turn",
      args: { turn, model },
      tokens_in: callRes.usage?.input_tokens ?? 0,
      tokens_out: callRes.usage?.output_tokens ?? 0,
      cost_usd: callRes.cost_usd ?? 0,
      result_summary: json.stop_reason,
    });

    const textParts = json.content.filter((c) => c.type === "text");
    const toolUses = json.content.filter((c) => c.type === "tool_use");
    messages.push({ role: "assistant", content: json.content });

    if (toolUses.length === 0 || json.stop_reason !== "tool_use") {
      finalText = textParts.map((c) => c.text ?? "").join("\n").trim();
      break;
    }

    const toolResults: Array<Record<string, unknown>> = [];
    for (const tu of toolUses) {
      const name = tu.name ?? "";
      const args = tu.input ?? {};
      if (ACTION_TOOLS.has(name)) {
        // Intercept — propose, do NOT execute.
        pendingActions.push({
          tool: name,
          args,
          summary: `${name}(${JSON.stringify(args)})`,
        });
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: "Bu aksiyon kullanıcı onayına sunuldu. Onaylanırsa ayrıca çalıştırılacak. Şimdilik bekliyor.",
        });
      } else if (READ_TOOLS.has(name)) {
        try {
          const result = await executeReadTool(name, args, svc, DOMAIN);
          traces.push({ name, ok: true });
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: JSON.stringify(result ?? null).slice(0, 12_000),
          });
        } catch (err) {
          traces.push({ name, ok: false });
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: `Error: ${err instanceof Error ? err.message : String(err)}`,
            is_error: true,
          });
        }
      } else {
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: `Bilinmeyen tool: ${name}`,
          is_error: true,
        });
      }
    }
    messages.push({ role: "user", content: toolResults });
  }

  const finalBudget = await checkDailyBudget(svc, DOMAIN);

  return NextResponse.json({
    ok: true,
    answer: finalText || "(yanıt üretilemedi)",
    pendingActions,
    budget: finalBudget,
    model,
    turn_cost_usd: Number(turnCostTotal.toFixed(4)),
    traces,
  });
}
