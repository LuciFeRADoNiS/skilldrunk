// /api/custodian/action — Faz 2 PR-E
//
// Approval-gated action executor. The chat endpoint only PROPOSES actions;
// this endpoint runs them after the user clicks Onayla in the UI.
//
// Allowlisted tools (v1):
//   • backlog_add        → sd_backlog_add RPC
//   • content_update     → existing constrained RPCs (skill/app status,
//                          featured/public toggle, quote add)
//   • trigger_redeploy   → Vercel deploy hook (env CUSTODIAN_DEPLOY_HOOK_URL)
//   • revalidate_path    → marketplace revalidate endpoint (env-gated)
//
// Every execution → cst_audit + cst_events(type=action). Admin-only.

import { NextResponse } from "next/server";
import { createServerClient } from "@skilldrunk/supabase/server";
import { serviceClient, logAudit } from "@/lib/custodian/budget";
import { logEvent } from "@/lib/custodian/events";
import { ACTION_TOOLS } from "@/lib/custodian/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOMAIN = "skilldrunk.com";

type Svc = NonNullable<ReturnType<typeof serviceClient>>;

async function execBacklogAdd(svc: Svc, args: Record<string, unknown>) {
  const title = String(args.title ?? "").trim();
  if (!title) throw new Error("title zorunlu");
  const { data, error } = await svc.rpc("sd_backlog_add", {
    p_title: title,
    p_project: args.project ? String(args.project) : "general",
    p_priority: args.priority ? Number(args.priority) : 3,
    p_source: "claude-code",
    p_status: "next",
    p_tags: ["custodian"],
  });
  if (error) throw new Error(error.message);
  return { backlog: data };
}

async function execContentUpdate(svc: Svc, args: Record<string, unknown>) {
  const target = String(args.target ?? "");
  const field = String(args.field ?? "");
  const slug = args.slug ? String(args.slug) : "";
  const value = args.value !== undefined ? String(args.value) : "";

  if (target === "skill" && field === "status") {
    const { error } = await svc.from("sd_skills").update({ status: value }).eq("slug", slug);
    if (error) throw new Error(error.message);
    return { target, slug, status: value };
  }
  if (target === "app") {
    if (field === "status") {
      const { error } = await svc.from("pt_apps").update({ status: value }).eq("slug", slug);
      if (error) throw new Error(error.message);
      return { target, slug, status: value };
    }
    if (field === "featured" || field === "public") {
      const col = field === "featured" ? "featured" : "is_public";
      const { data: cur, error: fe } = await svc.from("pt_apps").select(col).eq("slug", slug).maybeSingle();
      if (fe) throw new Error(fe.message);
      if (!cur) throw new Error(`app not found: ${slug}`);
      const next = !(cur as Record<string, boolean>)[col];
      const { error } = await svc.from("pt_apps").update({ [col]: next }).eq("slug", slug);
      if (error) throw new Error(error.message);
      return { target, slug, [col]: next };
    }
  }
  if (target === "quote" && field === "add") {
    // value format: "metin -- yazar"
    const [text, author] = value.split("--").map((s) => s.trim());
    if (!text) throw new Error("quote metni boş");
    const { data, error } = await svc
      .from("qt_quotes")
      .insert({ quote_text: text, author: author ?? "Anonim", source: "curated" })
      .select("id, quote_text, author")
      .single();
    if (error) throw new Error(error.message);
    return { quote: data };
  }
  throw new Error(`desteklenmeyen content_update: target=${target} field=${field}`);
}

async function execTriggerRedeploy() {
  const hook = process.env.CUSTODIAN_DEPLOY_HOOK_URL;
  if (!hook) throw new Error("CUSTODIAN_DEPLOY_HOOK_URL env yok — deploy hook tanımlı değil");
  const res = await fetch(hook, { method: "POST" });
  if (!res.ok) throw new Error(`deploy hook ${res.status}`);
  return { triggered: true, status: res.status };
}

async function execRevalidatePath(args: Record<string, unknown>) {
  const path = String(args.path ?? "").trim();
  if (!path) throw new Error("path zorunlu");
  const base = process.env.CUSTODIAN_REVALIDATE_URL; // örn https://skilldrunk.com/api/revalidate
  const secret = process.env.CUSTODIAN_REVALIDATE_SECRET;
  if (!base || !secret) {
    throw new Error(
      "CUSTODIAN_REVALIDATE_URL/SECRET env yok — marketplace revalidate endpoint'i bağlanmamış (v1 follow-up)",
    );
  }
  const res = await fetch(`${base}?path=${encodeURIComponent(path)}&secret=${encodeURIComponent(secret)}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`revalidate ${res.status}`);
  return { revalidated: path };
}

export async function POST(req: Request) {
  // Admin gate.
  const cookieSupabase = await createServerClient();
  const {
    data: { user },
  } = await cookieSupabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "auth required" }, { status: 401 });
  const { data: profile } = await cookieSupabase
    .from("sd_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ ok: false, error: "admin only" }, { status: 403 });
  }

  let body: { tool?: string; args?: Record<string, unknown>; session_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  const tool = String(body.tool ?? "");
  const args = body.args ?? {};
  if (!ACTION_TOOLS.has(tool)) {
    return NextResponse.json({ ok: false, error: `izinli aksiyon değil: ${tool}` }, { status: 400 });
  }

  const svc = serviceClient();
  if (!svc) return NextResponse.json({ ok: false, error: "supabase service config eksik" }, { status: 500 });

  let result: unknown;
  let execError: string | null = null;
  try {
    switch (tool) {
      case "backlog_add":
        result = await execBacklogAdd(svc, args);
        break;
      case "content_update":
        result = await execContentUpdate(svc, args);
        break;
      case "trigger_redeploy":
        result = await execTriggerRedeploy();
        break;
      case "revalidate_path":
        result = await execRevalidatePath(args);
        break;
    }
  } catch (err) {
    execError = err instanceof Error ? err.message : String(err);
  }

  // Audit + event (both success and failure recorded).
  const summary = execError ? `FAILED: ${execError}` : `ok: ${JSON.stringify(result).slice(0, 200)}`;
  await logAudit(svc, {
    domain: DOMAIN,
    session_id: body.session_id ?? null,
    tool,
    args,
    result_summary: summary,
  });
  await logEvent({
    type: "action",
    source: "custodian",
    actor: user.email ?? user.id,
    payload: { tool, args, ok: !execError, error: execError, result },
  });

  if (execError) {
    return NextResponse.json({ ok: false, error: execError }, { status: 500 });
  }
  return NextResponse.json({ ok: true, tool, result });
}
