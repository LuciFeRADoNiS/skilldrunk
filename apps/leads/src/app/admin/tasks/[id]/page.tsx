import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { renderTemplate, buildContext } from "@/lib/template-render";
import { ApproveRejectActions } from "./actions-client";

export const dynamic = "force-dynamic";

const EVENT_LABELS: Record<string, string> = {
  task_assigned: "Görev atandı",
  invite_sent: "Davet gönderildi",
  invite_opened: "Davet açıldı",
  staff_logged_in: "Giriş yaptı",
  task_viewed: "Görev görüntülendi",
  task_started: "Görev başlatıldı",
  task_field_changed: "Alan değişti",
  task_submitted: "Gönderildi",
  task_approved: "Onaylandı",
  task_rejected: "Reddedildi",
  task_resubmitted: "Yeniden gönderildi",
  session_started: "Oturum başladı",
  session_ended: "Oturum kapandı",
};

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const taskId = Number(id);
  if (!Number.isInteger(taskId) || taskId <= 0) notFound();

  const { supabase } = await requireAdmin();

  const { data: task } = await supabase
    .from("sd_lead_tasks")
    .select(
      "id, title, description, type, status, due_at, template_jsonb, result_jsonb, rejection_reason, created_at, submitted_at, approved_at, prospect_id, staff_id",
    )
    .eq("id", taskId)
    .maybeSingle();
  if (!task) notFound();

  const templateId = (task.template_jsonb as { template_id?: number })?.template_id;
  const honorific =
    (task.result_jsonb as { honorific?: string })?.honorific ??
    (task.template_jsonb as { honorific?: string })?.honorific ??
    "Bey";

  const [{ data: prospect }, { data: staff }, { data: template }, { data: events }, { data: sessions }] =
    await Promise.all([
      supabase
        .from("sd_lead_prospects")
        .select("id, name, email, phone, title, company, city, industry, score, linkedin_url")
        .eq("id", task.prospect_id)
        .maybeSingle(),
      supabase
        .from("sd_lead_staff")
        .select("id, email, full_name, team")
        .eq("id", task.staff_id)
        .maybeSingle(),
      templateId
        ? supabase
            .from("sd_lead_email_templates")
            .select("id, name, step_num, subject, body_md")
            .eq("id", templateId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("sd_lead_events")
        .select("id, event_type, ts, meta")
        .eq("task_id", taskId)
        .order("ts", { ascending: false })
        .limit(100),
      supabase
        .from("sd_lead_sessions")
        .select("id, started_at, ended_at, duration_s")
        .eq("task_id", taskId)
        .order("started_at", { ascending: false }),
    ]);

  const renderedSubject =
    prospect && template ? renderTemplate(template.subject, buildContext(prospect, honorific)) : "";
  const renderedBody =
    prospect && template ? renderTemplate(template.body_md, buildContext(prospect, honorific)) : "";

  const result = (task.result_jsonb as Record<string, unknown>) ?? {};

  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-xs text-neutral-400 hover:text-neutral-100">
        ← Dashboard
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-neutral-500">
            Görev #{task.id} · {task.type}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{task.title}</h1>
          <p className="mt-1 text-sm text-neutral-400">
            <span className="font-mono">{task.status}</span>
            {task.due_at && ` · Son: ${new Date(task.due_at).toLocaleDateString("tr-TR")}`}
          </p>
        </div>
      </header>

      {/* Approve / Reject controls */}
      <ApproveRejectActions taskId={task.id} status={task.status as string} />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Staff */}
        <section className="rounded-lg border border-neutral-900 bg-neutral-950 p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Personel
          </h2>
          <p className="font-medium">{staff?.full_name ?? "(silinmiş)"}</p>
          <p className="font-mono text-xs text-neutral-500">{staff?.email}</p>
          <p className="text-xs text-neutral-400">{staff?.team}</p>
        </section>

        {/* Prospect */}
        <section className="rounded-lg border border-neutral-900 bg-neutral-950 p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Müşteri
          </h2>
          <p className="font-medium">{prospect?.name ?? "(silinmiş)"}</p>
          <p className="text-xs text-neutral-400">{prospect?.title}</p>
          <p className="text-xs text-neutral-400">{prospect?.company}</p>
          <p className="font-mono text-xs text-neutral-500">{prospect?.email}</p>
        </section>
      </div>

      {/* Email template render */}
      {template && (
        <section className="rounded-lg border border-neutral-900 bg-neutral-950 p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Mail (render edilmiş) · {template.name}
          </h2>
          <p className="mb-2 text-xs text-neutral-500">Konu</p>
          <p className="mb-3 rounded bg-neutral-900 px-3 py-2 font-mono text-xs">{renderedSubject}</p>
          <p className="mb-2 text-xs text-neutral-500">Body</p>
          <pre className="whitespace-pre-wrap rounded bg-neutral-900 px-3 py-3 font-sans text-sm leading-relaxed">
            {renderedBody}
          </pre>
        </section>
      )}

      {/* Submission result */}
      {Object.keys(result).length > 0 && (
        <section className="rounded-lg border border-neutral-900 bg-neutral-950 p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Gönderim raporu
          </h2>
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {result.sent_at !== undefined && (
              <div>
                <dt className="text-xs text-neutral-500">Gönderim zamanı</dt>
                <dd>{new Date(String(result.sent_at)).toLocaleString("tr-TR")}</dd>
              </div>
            )}
            {result.honorific !== undefined && (
              <div>
                <dt className="text-xs text-neutral-500">Hitap</dt>
                <dd>{String(result.honorific)}</dd>
              </div>
            )}
            {Boolean(result.channel_confirmed) && (
              <div>
                <dt className="text-xs text-neutral-500">CC onayı</dt>
                <dd className="text-emerald-300">✓ Onaylandı</dd>
              </div>
            )}
            {Boolean(result.personalization_notes) && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-neutral-500">Özelleştirme notları</dt>
                <dd className="rounded bg-neutral-900 px-3 py-2 text-xs">
                  {String(result.personalization_notes)}
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {/* Sessions */}
      {sessions && sessions.length > 0 && (
        <section className="rounded-lg border border-neutral-900 bg-neutral-950 p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Oturumlar ({sessions.length})
          </h2>
          <ul className="space-y-1 text-xs">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between font-mono">
                <span className="text-neutral-400">
                  {new Date(s.started_at).toLocaleString("tr-TR")}
                </span>
                <span className="text-neutral-500">
                  {s.duration_s !== null ? `${s.duration_s}s` : "açık"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Event timeline */}
      <section className="rounded-lg border border-neutral-900 bg-neutral-950 p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Aktivite timeline ({events?.length ?? 0})
        </h2>
        <ul className="space-y-1.5 text-xs">
          {events?.map((e) => (
            <li key={e.id} className="flex items-start gap-3 border-b border-neutral-900 pb-1.5 last:border-0">
              <span className="font-mono text-neutral-500 shrink-0">
                {new Date(e.ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <span className="flex-1">{EVENT_LABELS[e.event_type as string] ?? e.event_type}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
