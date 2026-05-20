import Link from "next/link";
import { requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  email_send: "Mail",
  call_report: "Arama",
};

export default async function HistoryPage() {
  const { supabase, staffId } = await requireStaff();
  const { data: tasks } = await supabase
    .from("sd_lead_tasks")
    .select("id, title, type, status, submitted_at, approved_at, updated_at")
    .eq("staff_id", staffId)
    .in("status", ["email_sent", "replied", "meeting_booked", "submitted", "approved", "closed"])
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Geçmiş</h1>
          <p className="mt-1 text-sm text-neutral-400">Tamamlanan görevler (son 100)</p>
        </div>
        <Link href="/me" className="text-xs text-neutral-400 hover:text-neutral-100">
          ← aktif
        </Link>
      </div>

      {(!tasks || tasks.length === 0) && (
        <div className="rounded-xl border border-neutral-900 bg-neutral-950 p-8 text-center text-sm text-neutral-500">
          Henüz tamamlanmış görev yok.
        </div>
      )}

      <ul className="space-y-2">
        {tasks?.map((t) => (
          <li key={t.id} className="rounded-xl border border-neutral-900 bg-neutral-950 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="flex-1 text-sm">{t.title}</p>
              <span className="shrink-0 text-[10px] uppercase text-neutral-500">
                {TYPE_LABELS[t.type as string] ?? t.type}
              </span>
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              {t.status}
              {t.submitted_at && ` · gönd. ${new Date(t.submitted_at).toLocaleDateString("tr-TR")}`}
              {t.approved_at && ` · onay ${new Date(t.approved_at).toLocaleDateString("tr-TR")}`}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
