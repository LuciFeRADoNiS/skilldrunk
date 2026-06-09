import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/nav";
import { ChatPanel } from "@/components/custodian/ChatPanel";
import {
  AuditPanel,
  type AuditRow,
  type ActionRow,
} from "@/components/custodian/AuditPanel";

export const dynamic = "force-dynamic";

const DOMAIN = "skilldrunk.com";

async function fetchAudit(): Promise<{ audit: AuditRow[]; actions: ActionRow[]; total: number }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { audit: [], actions: [], total: 0 };
  const svc = createClient(url, key, { auth: { persistSession: false } });
  const since = new Date(Date.now() - 86_400_000).toISOString();

  const [auditRes, actionRes] = await Promise.all([
    svc
      .from("cst_audit")
      .select("tool, result_summary, cost_usd, tokens_in, tokens_out, created_at")
      .eq("domain", DOMAIN)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<AuditRow[]>(),
    svc
      .from("cst_events")
      .select("actor, payload, created_at")
      .eq("domain", DOMAIN)
      .eq("type", "action")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(30)
      .returns<ActionRow[]>(),
  ]);

  const audit = auditRes.data ?? [];
  const total = audit.reduce((s, r) => s + Number(r.cost_usd ?? 0), 0);
  return { audit, actions: actionRes.data ?? [], total };
}

export default async function CustodianPage() {
  const { profile } = await requireAdmin("/custodian");
  const { audit, actions, total } = await fetchAudit();

  return (
    <>
      <div className="aurora" />
      <AdminNav userLabel={profile?.display_name ?? undefined} />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-4 sm:pt-6 pb-10">
        <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-500 mb-3">
          domain custodian
        </p>
        <AuditPanel audit={audit} actions={actions} totalCostUsd={total} />
        <ChatPanel
          chatEndpoint="/api/custodian/chat"
          actionEndpoint="/api/custodian/action"
          title="Domain Custodian — skilldrunk.com"
        />
      </main>
    </>
  );
}
