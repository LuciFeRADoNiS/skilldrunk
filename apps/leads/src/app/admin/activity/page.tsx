import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const EVENT_LABELS: Record<string, { label: string; tone: string }> = {
  task_assigned: { label: "📌 Atandı", tone: "text-neutral-300" },
  staff_logged_in: { label: "→ Giriş", tone: "text-neutral-400" },
  task_viewed: { label: "👁 Görüntülendi", tone: "text-neutral-400" },
  task_started: { label: "▶ Başlatıldı", tone: "text-blue-300" },
  task_submitted: { label: "✉ Gönderildi", tone: "text-orange-300" },
  task_approved: { label: "✓ Onaylandı", tone: "text-emerald-300" },
  task_rejected: { label: "✗ Reddedildi", tone: "text-red-300" },
  task_resubmitted: { label: "↻ Yeniden gönderildi", tone: "text-blue-300" },
  session_started: { label: "⊕ Oturum", tone: "text-neutral-500" },
  session_ended: { label: "⊖ Oturum", tone: "text-neutral-500" },
};

type EventRow = {
  id: number;
  task_id: number | null;
  staff_id: number | null;
  event_type: string;
  ts: string;
  meta: Record<string, unknown> | null;
};

export default async function ActivityPage() {
  const { supabase } = await requireAdmin();

  const { data: events } = (await supabase
    .from("sd_lead_events")
    .select("id, task_id, staff_id, event_type, ts, meta")
    .order("ts", { ascending: false })
    .limit(200)) as { data: EventRow[] | null };

  const staffIds = Array.from(new Set((events ?? []).map((e) => e.staff_id).filter(Boolean))) as number[];
  const taskIds = Array.from(new Set((events ?? []).map((e) => e.task_id).filter(Boolean))) as number[];

  const [{ data: staff }, { data: tasks }] = await Promise.all([
    staffIds.length > 0
      ? supabase.from("sd_lead_staff").select("id, full_name, email").in("id", staffIds)
      : Promise.resolve({ data: [] }),
    taskIds.length > 0
      ? supabase.from("sd_lead_tasks").select("id, title").in("id", taskIds)
      : Promise.resolve({ data: [] }),
  ]);

  const staffMap = new Map((staff ?? []).map((s) => [s.id, s]));
  const taskMap = new Map((tasks ?? []).map((t) => [t.id, t]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Aktivite</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Son 200 event (login, görüntüleme, gönderim, onay). Toplam: {events?.length ?? 0}
        </p>
      </div>

      {(!events || events.length === 0) && (
        <div className="rounded-lg border border-neutral-900 bg-neutral-950 p-6 text-center text-sm text-neutral-500">
          Henüz aktivite yok.
        </div>
      )}

      <ul className="space-y-1">
        {events?.map((e) => {
          const tone = EVENT_LABELS[e.event_type]?.tone ?? "text-neutral-300";
          const label = EVENT_LABELS[e.event_type]?.label ?? e.event_type;
          const staffRow = e.staff_id ? staffMap.get(e.staff_id) : null;
          const taskRow = e.task_id ? taskMap.get(e.task_id) : null;
          return (
            <li
              key={e.id}
              className="grid grid-cols-[80px_120px_1fr_auto] gap-3 rounded-md px-3 py-2 text-xs hover:bg-neutral-900/50"
            >
              <span className="font-mono text-neutral-500">
                {new Date(e.ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className={tone}>{label}</span>
              <span className="truncate">
                {staffRow ? (
                  <span className="font-medium">{staffRow.full_name ?? staffRow.email}</span>
                ) : (
                  <span className="text-neutral-600">—</span>
                )}
                {taskRow && (
                  <>
                    {" · "}
                    <Link href={`/admin/tasks/${taskRow.id}`} className="text-orange-400 hover:underline">
                      {taskRow.title.slice(0, 50)}
                      {taskRow.title.length > 50 ? "…" : ""}
                    </Link>
                  </>
                )}
              </span>
              <span className="text-neutral-600 font-mono">
                {new Date(e.ts).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
