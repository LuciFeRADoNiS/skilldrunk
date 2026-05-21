"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase-admin";
import { notifyTaskApproved, notifyTaskRejected } from "@/lib/task-notify";

const rejectSchema = z.object({
  reason: z.string().min(1).max(2000),
});

export async function approveTask(taskId: number) {
  const { user } = await requireAdmin();
  const admin = createServiceRoleClient();

  const { data: task } = await admin
    .from("sd_lead_tasks")
    .select("status")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return { error: "Görev bulunamadı" };
  if (!["email_sent", "submitted"].includes(task.status as string)) {
    return { error: `Bu görev şu an onaylanamaz (${task.status})` };
  }

  const { error } = await admin
    .from("sd_lead_tasks")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    })
    .eq("id", taskId);
  if (error) return { error: error.message };

  await admin.from("sd_lead_events").insert({
    task_id: taskId,
    event_type: "task_approved",
    meta: { via: "admin_ui", approved_by_user_id: user.id },
  });

  await notifyTaskApproved(taskId);

  revalidatePath(`/admin/tasks/${taskId}`);
  revalidatePath("/admin");
  return { success: true };
}

export async function rejectTask(taskId: number, formData: FormData) {
  const { user } = await requireAdmin();
  const parsed = rejectSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) return { error: "Red sebebi gerekli" };

  const admin = createServiceRoleClient();
  const { data: task } = await admin
    .from("sd_lead_tasks")
    .select("status")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return { error: "Görev bulunamadı" };

  const { error } = await admin
    .from("sd_lead_tasks")
    .update({
      status: "rejected",
      rejection_reason: parsed.data.reason,
    })
    .eq("id", taskId);
  if (error) return { error: error.message };

  await admin.from("sd_lead_events").insert({
    task_id: taskId,
    event_type: "task_rejected",
    meta: { via: "admin_ui", reason: parsed.data.reason, rejected_by_user_id: user.id },
  });

  await notifyTaskRejected(taskId, parsed.data.reason);

  revalidatePath(`/admin/tasks/${taskId}`);
  revalidatePath("/admin");
  return { success: true };
}
