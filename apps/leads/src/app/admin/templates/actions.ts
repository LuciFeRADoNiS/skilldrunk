"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";

const templateSchema = z.object({
  name: z.string().min(1).max(200),
  step_num: z.coerce.number().int().min(0).max(99).nullable().optional(),
  subject: z.string().min(1).max(500),
  body_md: z.string().min(1).max(20000),
  active: z.boolean().optional().default(true),
});

export async function createTemplate(formData: FormData) {
  const { supabase } = await requireAdmin();
  const parsed = templateSchema.safeParse({
    name: formData.get("name"),
    step_num: formData.get("step_num") || null,
    subject: formData.get("subject"),
    body_md: formData.get("body_md"),
    active: formData.get("active") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Doğrulama hatası" };
  }
  const { error } = await supabase
    .from("sd_lead_email_templates")
    .insert(parsed.data);
  if (error) return { error: error.message };
  revalidatePath("/admin/templates");
  redirect("/admin/templates");
}

export async function updateTemplate(id: number, formData: FormData) {
  const { supabase } = await requireAdmin();
  const parsed = templateSchema.safeParse({
    name: formData.get("name"),
    step_num: formData.get("step_num") || null,
    subject: formData.get("subject"),
    body_md: formData.get("body_md"),
    active: formData.get("active") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Doğrulama hatası" };
  }
  const { error } = await supabase
    .from("sd_lead_email_templates")
    .update(parsed.data)
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/templates");
  revalidatePath(`/admin/templates/${id}`);
  redirect("/admin/templates");
}
