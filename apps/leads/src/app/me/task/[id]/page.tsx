import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { TaskCard } from "./task-card";

export const dynamic = "force-dynamic";

export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const taskId = Number(id);
  if (!Number.isInteger(taskId) || taskId <= 0) notFound();

  const { supabase, staffId } = await requireStaff();

  const { data: task } = await supabase
    .from("sd_lead_tasks")
    .select(
      "id, title, description, type, status, due_at, template_jsonb, result_jsonb, rejection_reason, created_at, prospect_id",
    )
    .eq("id", taskId)
    .eq("staff_id", staffId)
    .maybeSingle();

  if (!task) notFound();

  const templateId = (task.template_jsonb as { template_id?: number })?.template_id;
  const defaultHonorific =
    (task.result_jsonb as { honorific?: string })?.honorific ??
    (task.template_jsonb as { honorific?: string })?.honorific ??
    "Bey";

  const [{ data: prospect }, { data: template }] = await Promise.all([
    supabase
      .from("sd_lead_prospects")
      .select("id, name, email, phone, title, company, city, industry, linkedin_url")
      .eq("id", task.prospect_id)
      .maybeSingle(),
    templateId
      ? supabase
          .from("sd_lead_email_templates")
          .select("id, name, step_num, subject, body_md")
          .eq("id", templateId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!prospect || !template) {
    return (
      <div className="space-y-4">
        <Link href="/me" className="text-xs text-neutral-400 hover:text-neutral-100">
          ← geri
        </Link>
        <div className="rounded-xl border border-red-900 bg-red-950/20 p-6 text-sm text-red-300">
          Bu görev için prospect veya template bilgisi eksik. Admin&apos;e haber ver (görev #{task.id}).
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link href="/me" className="text-xs text-neutral-400 hover:text-neutral-100">
        ← Görevlerim
      </Link>

      <TaskCard
        task={{
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status as string,
          rejection_reason: task.rejection_reason,
          due_at: task.due_at,
        }}
        prospect={prospect}
        template={template}
        defaultHonorific={defaultHonorific}
        savedResult={(task.result_jsonb as Record<string, unknown>) ?? {}}
      />
    </div>
  );
}
