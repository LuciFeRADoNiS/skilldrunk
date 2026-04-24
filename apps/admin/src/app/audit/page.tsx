import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/nav";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  actor_username: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const ACTION_ICON: Record<string, string> = {
  "skill.status_change": "📝",
  "user.role_change": "👤",
  "report.status_change": "🚩",
};

function rel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
}

function describe(row: Row): string {
  const meta = row.metadata ?? {};
  const ov = row.old_value ?? {};
  const nv = row.new_value ?? {};

  if (row.action === "skill.status_change") {
    return `${meta.title ?? meta.slug ?? row.target_id?.slice(0, 8)}: ${ov.status} → ${nv.status}`;
  }
  if (row.action === "user.role_change") {
    return `${meta.username ?? row.target_id?.slice(0, 8)}: ${ov.role} → ${nv.role}`;
  }
  if (row.action === "report.status_change") {
    return `Report ${String(meta.target_type ?? "")}: ${ov.status} → ${nv.status}`;
  }
  return JSON.stringify(nv);
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; actor?: string }>;
}) {
  const { action, actor } = await searchParams;
  const { supabase, profile } = await requireAdmin("/audit");

  let q = supabase
    .from("sd_audit_log")
    .select(
      "id, actor_username, action, target_type, target_id, old_value, new_value, metadata, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (action) q = q.eq("action", action);
  if (actor) q = q.eq("actor_username", actor);

  const { data } = await q.returns<Row[]>();
  const rows = data ?? [];

  const actions = Array.from(new Set(rows.map((r) => r.action)));
  const actors = Array.from(new Set(rows.map((r) => r.actor_username).filter(Boolean))) as string[];

  return (
    <>
      <AdminNav userLabel={profile?.display_name ?? undefined} />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="mb-2 text-2xl font-semibold">Audit Log</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Kim, ne, ne zaman. Admin aksiyonları otomatik loglanır.
        </p>

        <div className="mb-6 flex flex-wrap gap-2 text-xs">
          <Link
            href="/audit"
            className={`rounded-md border px-3 py-1 ${!action && !actor ? "border-orange-500 bg-orange-500/10 text-orange-400" : "border-neutral-800 text-neutral-400 hover:bg-neutral-900"}`}
          >
            all
          </Link>
          {actions.map((a) => (
            <Link
              key={a}
              href={`/audit?action=${encodeURIComponent(a)}`}
              className={`rounded-md border px-3 py-1 font-mono ${action === a ? "border-orange-500 bg-orange-500/10 text-orange-400" : "border-neutral-800 text-neutral-400 hover:bg-neutral-900"}`}
            >
              {a}
            </Link>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-900 p-12 text-center text-sm text-neutral-500">
            Bu filtrede kayıt yok.
          </div>
        ) : (
          <ul className="divide-y divide-neutral-900 rounded-lg border border-neutral-900 bg-neutral-950">
            {rows.map((r) => (
              <li key={r.id} className="flex gap-3 px-4 py-3">
                <span className="text-xl">{ACTION_ICON[r.action] ?? "🔎"}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm">
                      <span className="font-medium">
                        {r.actor_username ?? "—"}
                      </span>{" "}
                      <span className="text-neutral-500">{describe(r)}</span>
                    </p>
                    <span className="shrink-0 font-mono text-[10px] text-neutral-600">
                      {rel(r.created_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] text-neutral-600">
                    {r.action}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {actors.length > 0 && (
          <div className="mt-6 text-xs text-neutral-500">
            Actors: {actors.join(", ")}
          </div>
        )}
      </main>
    </>
  );
}
