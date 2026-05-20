import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase-admin";

const submitSchema = z.object({
  sent_at: z.string().min(1),
  channel_confirmed: z.literal(true),
  personalization_notes: z.string().max(2000).optional(),
  honorific: z.string().max(20).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const taskId = Number(id);
  if (!Number.isInteger(taskId) || taskId <= 0) {
    return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
  }

  const { staffId, user } = await requireStaff();
  const admin = createServiceRoleClient();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Verify ownership + current status
  const { data: task } = await admin
    .from("sd_lead_tasks")
    .select("id, status, staff_id, template_jsonb, result_jsonb")
    .eq("id", taskId)
    .maybeSingle();
  if (!task || task.staff_id !== staffId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Allow submit only when in_progress / assigned / rejected
  if (!["assigned", "in_progress", "rejected"].includes(task.status as string)) {
    return NextResponse.json(
      { error: `Bu görev şu an gönderilemez (status: ${task.status})` },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const result = {
    ...(task.result_jsonb ?? {}),
    sent_at: data.sent_at,
    channel_confirmed: true,
    personalization_notes: data.personalization_notes ?? null,
    honorific: data.honorific ?? (task.template_jsonb as { honorific?: string })?.honorific ?? null,
    submitted_by_user_id: user.id,
  };

  const { error: updateError } = await admin
    .from("sd_lead_tasks")
    .update({
      status: "email_sent",
      submitted_at: now,
      result_jsonb: result,
    })
    .eq("id", taskId);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;

  await admin.from("sd_lead_events").insert({
    task_id: taskId,
    staff_id: staffId,
    event_type: "task_submitted",
    meta: {
      template_id: (task.template_jsonb as { template_id?: number })?.template_id ?? null,
      sent_at: data.sent_at,
      has_personalization: Boolean(data.personalization_notes?.trim().length),
    },
    ip,
    user_agent: userAgent,
  });

  // Close any open sessions for this task
  await admin
    .from("sd_lead_sessions")
    .update({ ended_at: now })
    .eq("task_id", taskId)
    .eq("staff_id", staffId)
    .is("ended_at", null);

  // M5: notifyApolloBot(taskId) — Telegram notification

  return NextResponse.json({ ok: true, status: "email_sent" });
}
