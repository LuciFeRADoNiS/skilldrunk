// AuditPanel — Faz 3 PR-H
//
// "Son 24 saat custodian aksiyon/audit" paneli (master spec §2). Server
// component'ten gelen cst_audit + cst_events(action) satırlarını gösterir.
// Salt-görüntü; veri /custodian/page.tsx'te service client ile çekilir.

export interface AuditRow {
  tool: string;
  result_summary: string | null;
  cost_usd: number;
  tokens_in: number;
  tokens_out: number;
  created_at: string;
}

export interface ActionRow {
  actor: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

interface Props {
  audit: AuditRow[];
  actions: ActionRow[];
  totalCostUsd: number;
}

const TOOL_LABEL: Record<string, string> = {
  "chat-turn": "Sohbet turu",
  backlog_add: "Backlog ekle",
  content_update: "İçerik güncelle",
  trigger_redeploy: "Yeniden deploy",
  revalidate_path: "Cache temizle",
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "şimdi";
  if (m < 60) return `${m}dk`;
  const h = Math.floor(m / 60);
  return `${h}sa`;
}

export function AuditPanel({ audit, actions, totalCostUsd }: Props) {
  const actionCount = actions.length;
  const toolCalls = audit.filter((a) => a.tool !== "chat-turn");

  return (
    <details className="glass rounded-2xl p-4 mb-4" open={actionCount > 0}>
      <summary className="cursor-pointer text-sm font-medium flex items-center justify-between">
        <span>
          Son 24 saat — {actionCount} aksiyon · {audit.length} kayıt
        </span>
        <span className="text-[11px] font-mono text-neutral-400">
          ${totalCostUsd.toFixed(4)}
        </span>
      </summary>

      <div className="mt-3 space-y-3">
        {actionCount > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5">
              aksiyonlar
            </p>
            <ul className="space-y-1">
              {actions.map((a, i) => {
                const tool = String(a.payload?.tool ?? "?");
                const ok = a.payload?.ok !== false;
                return (
                  <li key={i} className="text-xs flex items-center gap-2">
                    <span className={ok ? "text-emerald-400" : "text-red-400"}>
                      {ok ? "✓" : "✗"}
                    </span>
                    <span className="flex-1">
                      {TOOL_LABEL[tool] ?? tool}
                      <span className="text-neutral-500"> · {a.actor ?? "?"}</span>
                    </span>
                    <span className="text-[10px] text-neutral-600 font-mono">
                      {relTime(a.created_at)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {toolCalls.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5">
              tool çağrıları
            </p>
            <ul className="space-y-1">
              {toolCalls.slice(0, 20).map((a, i) => (
                <li key={i} className="text-xs flex items-center gap-2 text-neutral-400">
                  <span className="flex-1 truncate">
                    {TOOL_LABEL[a.tool] ?? a.tool}
                    {a.result_summary && (
                      <span className="text-neutral-600"> — {a.result_summary.slice(0, 60)}</span>
                    )}
                  </span>
                  {a.cost_usd > 0 && (
                    <span className="text-[10px] font-mono text-neutral-600">
                      ${a.cost_usd.toFixed(4)}
                    </span>
                  )}
                  <span className="text-[10px] text-neutral-600 font-mono">
                    {relTime(a.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {audit.length === 0 && actionCount === 0 && (
          <p className="text-xs text-neutral-500">Son 24 saatte custodian aktivitesi yok.</p>
        )}
      </div>
    </details>
  );
}
