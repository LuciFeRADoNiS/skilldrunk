"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase-admin";

const newTaskSchema = z.object({
  prospect_id: z.coerce.number().int().positive(),
  staff_id: z.coerce.number().int().positive(),
  template_id: z.coerce.number().int().positive(),
  due_at: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  honorific: z.string().max(20).optional(),
  description: z.string().max(2000).optional(),
});

export async function createTask(formData: FormData) {
  const { user } = await requireAdmin();

  const parsed = newTaskSchema.safeParse({
    prospect_id: formData.get("prospect_id"),
    staff_id: formData.get("staff_id"),
    template_id: formData.get("template_id"),
    due_at: formData.get("due_at"),
    honorific: formData.get("honorific") || undefined,
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Doğrulama hatası" };
  }
  const data = parsed.data;

  const admin = createServiceRoleClient();

  // Resolve prospect + template for a friendly task title
  const [{ data: prospect }, { data: template }] = await Promise.all([
    admin.from("sd_lead_prospects").select("id, name, company").eq("id", data.prospect_id).maybeSingle(),
    admin.from("sd_lead_email_templates").select("id, name").eq("id", data.template_id).maybeSingle(),
  ]);
  if (!prospect) return { error: "Prospect bulunamadı." };
  if (!template) return { error: "Template bulunamadı." };

  const title = `${template.name} — ${prospect.name}${prospect.company ? ` · ${prospect.company}` : ""}`;

  const { data: task, error } = await admin
    .from("sd_lead_tasks")
    .insert({
      prospect_id: data.prospect_id,
      staff_id: data.staff_id,
      type: "email_send",
      title,
      description: data.description ?? null,
      due_at: data.due_at ?? null,
      template_jsonb: {
        template_id: data.template_id,
        honorific: data.honorific ?? null,
      },
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !task) return { error: error?.message ?? "Görev oluşturulamadı." };

  await admin.from("sd_lead_events").insert({
    task_id: task.id,
    staff_id: data.staff_id,
    event_type: "task_assigned",
    meta: { template_id: data.template_id, created_by_user_id: user.id },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/new");
  redirect(`/admin?created=${task.id}`);
}
