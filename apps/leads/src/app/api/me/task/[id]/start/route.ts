import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase-admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const taskId = Number(id);
  if (!Number.isInteger(taskId) || taskId <= 0) {
    return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
  }

  const { staffId } = await requireStaff();
  const admin = createServiceRoleClient();

  // Verify ownership
  const { data: task } = await admin
    .from("sd_lead_tasks")
    .select("id, status, staff_id")
    .eq("id", taskId)
    .maybeSingle();
  if (!task || task.staff_id !== staffId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;

  // Log view + start events
  await admin.from("sd_lead_events").insert([
    { task_id: taskId, staff_id: staffId, event_type: "task_viewed", ip, user_agent: userAgent },
    { task_id: taskId, staff_id: staffId, event_type: "task_started", ip, user_agent: userAgent },
  ]);

  // Promote status from 'assigned' to 'in_progress' on first open
  if (task.status === "assigned") {
    await admin
      .from("sd_lead_tasks")
      .update({ status: "in_progress" })
      .eq("id", taskId);
  }

  // Open a new session
  const { data: session } = await admin
    .from("sd_lead_sessions")
    .insert({ staff_id: staffId, task_id: taskId, ip, user_agent: userAgent })
    .select("id")
    .single();

  await admin.from("sd_lead_events").insert({
    task_id: taskId,
    staff_id: staffId,
    event_type: "session_started",
    meta: { session_id: session?.id ?? null },
  });

  return NextResponse.json({ ok: true, session_id: session?.id ?? null });
}
