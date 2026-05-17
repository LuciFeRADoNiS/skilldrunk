import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/nav";
import { AddBacklogSheet } from "./add-sheet";
import { addBacklogAction, setStatusAction } from "./actions";

export const dynamic = "force-dynamic";

type Status =
  | "idea"
  | "next"
  | "in_progress"
  | "blocked"
  | "done"
  | "wontfix";

type Row = {
  id: number;
  title: string;
  body_md: string | null;
  project: string;
  status: Status;
  priority: number;
  source: string;
  assignee: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type StatusFilter = Status | "active" | "all";

const STATUS_PILLS: { value: StatusFilter; label: string }[] = [
  { value: "active", label: "Aktif" },
  { value: "in_progress", label: "Devam" },
  { value: "next", label: "Sıra" },
  { value: "blocked", label: "Engelli" },
  { value: "idea", label: "Fikir" },
  { value: "done", label: "Bitti" },
  { value: "all", label: "Tümü" },
];

const STATUS_META: Record<Status, { dot: string; label: string }> = {
  idea: { dot: "bg-neutral-500", label: "fikir" },
  next: { dot: "bg-sky-400", label: "sıra" },
  in_progress: { dot: "bg-orange-400", label: "devam" },
  blocked: { dot: "bg-amber-400", label: "engelli" },
  done: { dot: "bg-emerald-400", label: "bitti" },
  wontfix: { dot: "bg-neutral-700", label: "wontfix" },
};

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return iso.split("T")[0];
}

export default async function BacklogPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; project?: string }>;
}) {
  const { supabase, profile } = await requireAdmin("/backlog");
  const sp = await searchParams;
  const statusFilter = (sp.status as StatusFilter) ?? "active";
  const projectFilter = sp.project ?? "";

  let query = supabase
    .from("sd_backlog")
    .select(
      "id, title, body_md, project, status, priority, source, assignee, tags, created_at, updated_at, completed_at",
    )
    .order("priority", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(200);

  if (statusFilter === "active") {
    query = query.in("status", ["in_progress", "next", "blocked"]);
  } else if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }
  if (projectFilter) query = query.eq("project", projectFilter);

  const { data } = await query.returns<Row[]>();
  const rows = data ?? [];

  // Project facets — pull from current result + distinct in any data
  const projectsSet = new Set<string>(rows.map((r) => r.project));
  const projects = Array.from(projectsSet).sort();

  // Quick counts for top stat strip
  const { data: counts } = await supabase
    .from("sd_backlog")
    .select("status", { count: "exact" });
  // We just need a few aggregate buckets — do client-side over fetched rows
  const allRows =
    (
      await supabase
        .from("sd_backlog")
        .select("status")
        .returns<{ status: Status }[]>()
    ).data ?? [];
  const totals = {
    in_progress: allRows.filter((r) => r.status === "in_progress").length,
    next: allRows.filter((r) => r.status === "next").length,
    blocked: allRows.filter((r) => r.status === "blocked").length,
    done: allRows.filter((r) => r.status === "done").length,
  };

  return (
    <>
      <div className="aurora" />
      <AdminNav userLabel={profile?.display_name ?? undefined} />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-4 sm:pt-6 pb-10">
        {/* Hero */}
        <section className="mb-4">
          <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-500">
            havuz
          </p>
          <div className="flex items-end justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Backlog
            </h1>
            <AddBacklogSheet
              action={addBacklogAction}
              projects={projects}
            />
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Tek doğru kaynak. AGENTS.md / handoff özet — gerçek liste burada.
          </p>
        </section>

        {/* Stat strip */}
        <section className="mb-4 grid grid-cols-4 gap-2">
          <Stat label="Devam" value={totals.in_progress} accent="text-orange-300" />
          <Stat label="Sıra" value={totals.next} accent="text-sky-300" />
          <Stat label="Engelli" value={totals.blocked} accent="text-amber-300" />
          <Stat label="Bitti" value={totals.done} accent="text-emerald-300" />
        </section>

        {/* Status filter chips */}
        <section className="mb-3 -mx-4 sm:mx-0">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 sm:px-0">
            {STATUS_PILLS.map((p) => {
              const active = p.value === statusFilter;
              const href = `/backlog?status=${p.value}${
                projectFilter ? `&project=${projectFilter}` : ""
              }`;
              return (
                <a
                  key={p.value}
                  href={href}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-mono transition ${
                    active
                      ? "bg-orange-500/20 text-orange-200 ring-1 ring-orange-500/40"
                      : "glass text-neutral-400"
                  }`}
                >
                  {p.label}
                </a>
              );
            })}
          </div>
        </section>

        {/* Project filter chips */}
        {projects.length > 0 && (
          <section className="mb-4 -mx-4 sm:mx-0">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 sm:px-0">
              <a
                href={`/backlog?status=${statusFilter}`}
                className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-mono transition ${
                  !projectFilter
                    ? "bg-neutral-200 text-neutral-900"
                    : "glass text-neutral-400"
                }`}
              >
                tüm projeler
              </a>
              {projects.map((p) => (
                <a
                  key={p}
                  href={`/backlog?status=${statusFilter}&project=${p}`}
                  className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-mono transition ${
                    projectFilter === p
                      ? "bg-neutral-200 text-neutral-900"
                      : "glass text-neutral-400"
                  }`}
                >
                  {p}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Rows */}
        {rows.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-sm text-neutral-500">
            Bu filtreye uyan kayıt yok.
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <BacklogRow key={r.id} row={r} />
            ))}
          </ul>
        )}

        <p className="mt-6 text-center text-[11px] text-neutral-600 font-mono">
          {rows.length} kayıt · API: <a className="underline" href="/api/backlog/export.md">/api/backlog/export.md</a>
        </p>
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="glass rounded-2xl p-3">
      <p className="text-[9px] uppercase tracking-wider text-neutral-500">
        {label}
      </p>
      <p className={`mt-0.5 text-xl font-semibold tabular-nums ${accent}`}>
        {value}
      </p>
    </div>
  );
}

function BacklogRow({ row }: { row: Row }) {
  const meta = STATUS_META[row.status];
  const isActive =
    row.status === "in_progress" ||
    row.status === "next" ||
    row.status === "blocked";

  return (
    <li
      className={`glass rounded-2xl p-3 ${
        row.status === "in_progress" ? "ring-1 ring-orange-500/30" : ""
      } ${row.status === "done" ? "opacity-50" : ""}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${meta.dot}`}
          title={meta.label}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{row.title}</p>
          {row.body_md && (
            <p className="mt-1 text-xs text-neutral-500 line-clamp-2">
              {row.body_md}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-neutral-500">
            <span className="rounded-full bg-neutral-800/60 px-1.5 py-0.5">
              {row.project}
            </span>
            <span>P{row.priority}</span>
            <span className="opacity-60">{relTime(row.updated_at)}</span>
            {row.assignee && row.assignee !== "shared" && (
              <span className="opacity-60">@{row.assignee}</span>
            )}
            {(row.tags ?? []).slice(0, 4).map((t) => (
              <span key={t} className="text-neutral-600">
                #{t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Action row — quick status changes */}
      {isActive && (
        <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar pl-5">
          {row.status !== "in_progress" && (
            <QuickAction id={row.id} status="in_progress" label="Başla" />
          )}
          {row.status !== "blocked" && (
            <QuickAction id={row.id} status="blocked" label="Engelli" />
          )}
          {row.status !== "next" && (
            <QuickAction id={row.id} status="next" label="Sıraya al" />
          )}
          <QuickAction id={row.id} status="done" label="Bitir" emerald />
          <QuickAction id={row.id} status="wontfix" label="İptal" />
        </div>
      )}
      {row.status === "done" && row.completed_at && (
        <p className="mt-2 pl-5 text-[10px] font-mono text-emerald-400/70">
          bitti · {relTime(row.completed_at)}
        </p>
      )}
    </li>
  );
}

function QuickAction({
  id,
  status,
  label,
  emerald,
}: {
  id: number;
  status: Status;
  label: string;
  emerald?: boolean;
}) {
  return (
    <form action={setStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-mono transition active:scale-95 ${
          emerald
            ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
            : "glass text-neutral-400 hover:text-neutral-200"
        }`}
      >
        {label}
      </button>
    </form>
  );
}
