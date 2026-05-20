import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createTask } from "./actions";
import { NewTaskForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const { supabase } = await requireAdmin();

  const [{ data: prospects }, { data: staff }, { data: templates }] =
    await Promise.all([
      supabase
        .from("sd_lead_prospects")
        .select("id, name, company, title, city, email")
        .order("score", { ascending: false, nullsFirst: false })
        .order("name", { ascending: true })
        .limit(500),
      supabase
        .from("sd_lead_staff")
        .select("id, email, full_name, team")
        .eq("active", true)
        .order("full_name", { ascending: true }),
      supabase
        .from("sd_lead_email_templates")
        .select("id, name, step_num, subject, body_md")
        .eq("active", true)
        .order("step_num", { ascending: true, nullsFirst: false }),
    ]);

  const noData =
    !prospects?.length || !staff?.length || !templates?.length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Yeni Görev</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Tek prospect → tek satışçı → email_send görev. Cowork bu sayfayı atlayıp{" "}
          <code className="text-orange-400">POST /api/leads/new</code> ile programatik yaratabilir.
        </p>
      </div>

      {noData && (
        <div className="rounded-lg border border-amber-900 bg-amber-950/20 p-4 text-sm text-amber-300">
          Görev oluşturmadan önce şu üçünün de dolu olması gerek:
          <ul className="mt-2 ml-4 list-disc">
            <li>
              Prospects: {prospects?.length ?? 0} —{" "}
              <Link href="/admin/prospects" className="underline">listele</Link>
            </li>
            <li>
              Active staff: {staff?.length ?? 0} —{" "}
              <Link href="/admin/staff" className="underline">yönet</Link>
            </li>
            <li>
              Active templates: {templates?.length ?? 0} —{" "}
              <Link href="/admin/templates" className="underline">yönet</Link>
            </li>
          </ul>
          <p className="mt-3 text-xs">Cowork M3 sonu seed yapacak.</p>
        </div>
      )}

      <NewTaskForm
        action={createTask}
        prospects={prospects ?? []}
        staff={staff ?? []}
        templates={templates ?? []}
      />
    </div>
  );
}
