import Link from "next/link";
import { requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  assigned: { label: "Yeni atandı", tone: "bg-orange-900/40 text-orange-300" },
  in_progress: { label: "Görülmüş", tone: "bg-blue-900/40 text-blue-300" },
  email_sent: { label: "Gönderildi", tone: "bg-emerald-900/40 text-emerald-300" },
  replied: { label: "Yanıt geldi", tone: "bg-emerald-900/40 text-emerald-300" },
  rejected: { label: "Reddedildi · tekrar dene", tone: "bg-red-900/40 text-red-300" },
};

const TYPE_LABELS: Record<string, string> = {
  email_send: "Mail Gönder",
  call_report: "Arama Raporu",
  survey: "Anket",
  doc_review: "Doküman İnceleme",
  meeting_booking: "Toplantı Ayarla",
  free_form: "Serbest",
};

export default async function MePage() {
  const { supabase, staffId, user } = await requireStaff();

  const { data: staff } = await supabase
    .from("sd_lead_staff")
    .select("full_name, team")
    .eq("id", staffId)
    .maybeSingle();

  const { data: tasks } = await supabase
    .from("sd_lead_tasks")
    .select("id, title, type, status, due_at, updated_at")
    .eq("staff_id", staffId)
    .in("status", ["assigned", "in_progress", "rejected"])
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false });

  const tasksByStatus = (tasks ?? []).reduce<Record<string, typeof tasks>>(
    (acc, t) => {
      const key = t.status as string;
      (acc[key] ??= []).push(t);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-neutral-500">Hoşgeldin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {staff?.full_name ?? user.email}
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          {tasks?.length ?? 0} aktif görev · {staff?.team ?? "-"}
        </p>
      </div>

      {(!tasks || tasks.length === 0) && (
        <div className="rounded-xl border border-neutral-900 bg-neutral-950 p-8 text-center">
          <p className="text-base font-medium">Şu an aktif görev yok</p>
          <p className="mt-2 text-sm text-neutral-500">
            Yeni görev atandığında burada görünür ve sana Telegram&apos;dan haber gelir.
          </p>
        </div>
      )}

      {Object.entries(tasksByStatus).map(([statusKey, items]) => (
        <section key={statusKey} className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            {STATUS_LABELS[statusKey]?.label ?? statusKey} ({items?.length ?? 0})
          </h2>
          <ul className="space-y-2">
            {items?.map((t) => {
              const tone = STATUS_LABELS[t.status as string]?.tone ?? "bg-neutral-800 text-neutral-400";
              const isOverdue = t.due_at && new Date(t.due_at) < new Date();
              return (
                <li key={t.id}>
                  <Link
                    href={`/me/task/${t.id}`}
                    className="block rounded-xl border border-neutral-900 bg-neutral-950 p-4 active:scale-[0.99] active:bg-neutral-900 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="flex-1 text-sm font-medium leading-snug">{t.title}</p>
                      <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] uppercase tracking-wide ${tone}`}>
                        {STATUS_LABELS[t.status as string]?.label ?? t.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
                      <span>{TYPE_LABELS[t.type as string] ?? t.type}</span>
                      {t.due_at && (
                        <span className={isOverdue ? "text-red-400" : ""}>
                          · Son: {new Date(t.due_at).toLocaleDateString("tr-TR")}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
