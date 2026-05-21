/**
 * Server-side helper that builds + dispatches Apollo-bot notifications
 * for task lifecycle events. Pulls names/companies via service-role so it
 * can be called from server actions (admin) and API routes (staff submit).
 */
import { createServiceRoleClient } from "@/lib/supabase-admin";
import {
  notifyApollo,
  buildAssignedMessage,
  buildSubmittedMessage,
  buildApprovedMessage,
  buildRejectedMessage,
  type TaskNotifyContext,
} from "@/lib/apollo-bot";

async function loadContext(taskId: number): Promise<TaskNotifyContext | null> {
  const admin = createServiceRoleClient();
  const { data: task } = await admin
    .from("sd_lead_tasks")
    .select(
      "id, staff_id, prospect_id, template_jsonb, result_jsonb",
    )
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return null;

  const templateId = (task.template_jsonb as { template_id?: number })?.template_id;
  const [{ data: staff }, { data: prospect }, { data: template }] = await Promise.all([
    admin
      .from("sd_lead_staff")
      .select("full_name, email")
      .eq("id", task.staff_id)
      .maybeSingle(),
    admin
      .from("sd_lead_prospects")
      .select("name, company")
      .eq("id", task.prospect_id)
      .maybeSingle(),
    templateId
      ? admin
          .from("sd_lead_email_templates")
          .select("name")
          .eq("id", templateId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    taskId: task.id,
    staffName: staff?.full_name ?? staff?.email ?? "Bilinmeyen",
    prospectName: prospect?.name ?? "(prospect)",
    prospectCompany: prospect?.company ?? null,
    templateName: template?.name ?? "(template)",
  };
}

export async function notifyTaskAssigned(taskId: number) {
  const ctx = await loadContext(taskId);
  if (!ctx) return;
  await notifyApollo(buildAssignedMessage(ctx));
}

export async function notifyTaskSubmitted(
  taskId: number,
  opts: { hasPersonalization: boolean; sentAtIso: string },
) {
  const ctx = await loadContext(taskId);
  if (!ctx) return;
  await notifyApollo(buildSubmittedMessage({ ...ctx, ...opts }));
}

export async function notifyTaskApproved(taskId: number) {
  const ctx = await loadContext(taskId);
  if (!ctx) return;
  await notifyApollo(buildApprovedMessage(ctx));
}

export async function notifyTaskRejected(taskId: number, reason: string | null) {
  const ctx = await loadContext(taskId);
  if (!ctx) return;
  await notifyApollo(buildRejectedMessage({ ...ctx, reason }));
}
