import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase-admin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  const { staffId } = await requireStaff();
  const admin = createServiceRoleClient();

  const { data: session } = await admin
    .from("sd_lead_sessions")
    .select("id, staff_id, task_id, ended_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.staff_id !== staffId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (session.ended_at) {
    return NextResponse.json({ ok: true, already_ended: true });
  }

  await admin
    .from("sd_lead_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", sessionId);

  await admin.from("sd_lead_events").insert({
    task_id: session.task_id,
    staff_id: staffId,
    event_type: "session_ended",
    meta: { session_id: sessionId },
  });

  return NextResponse.json({ ok: true });
}
