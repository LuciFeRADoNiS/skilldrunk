import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { updateTemplate } from "../actions";
import { TemplateForm } from "../template-form";

export const dynamic = "force-dynamic";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  const { supabase } = await requireAdmin();
  const { data: template } = await supabase
    .from("sd_lead_email_templates")
    .select("id, name, step_num, subject, body_md, active")
    .eq("id", numericId)
    .maybeSingle();

  if (!template) notFound();

  const boundUpdate = updateTemplate.bind(null, numericId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Template düzenle</h1>
        <p className="mt-1 text-sm text-neutral-500">#{template.id}</p>
      </div>
      <TemplateForm initial={template} action={boundUpdate} submitLabel="Kaydet" />
    </div>
  );
}
