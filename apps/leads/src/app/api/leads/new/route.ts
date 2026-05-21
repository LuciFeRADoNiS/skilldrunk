import { NextResponse } from "next/server";
import { z } from "zod";
import { checkIngestAuth } from "@/lib/ingest-auth";
import { createServiceRoleClient } from "@/lib/supabase-admin";
import { notifyTaskAssigned } from "@/lib/task-notify";

const newTaskSchema = z.object({
  prospect_id: z.number().int().positive().optional(),
  prospect_email: z.string().email().optional(),
  staff_id: z.number().int().positive().optional(),
  staff_email: z.string().email().optional(),
  template_id: z.number().int().positive(),
  honorific: z.string().max(20).optional(),
  due_at: z.string().datetime().optional(),
  description: z.string().max(2000).optional(),
}).refine((d) => d.prospect_id || d.prospect_email, {
  message: "prospect_id or prospect_email required",
}).refine((d) => d.staff_id || d.staff_email, {
  message: "staff_id or staff_email required",
});

export async function POST(request: Request) {
  const auth = await checkIngestAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = newTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const admin = createServiceRoleClient();
  const data = parsed.data;

  // Resolve prospect
  const prospectQuery = data.prospect_id
    ? admin.from("sd_lead_prospects").select("id, name, company").eq("id", data.prospect_id)
    : admin.from("sd_lead_prospects").select("id, name, company").eq("email", data.prospect_email!);
  const { data: prospect } = await prospectQuery.maybeSingle();
  if (!prospect) return NextResponse.json({ error: "Prospect not found" }, { status: 404 });

  // Resolve staff
  const staffQuery = data.staff_id
    ? admin.from("sd_lead_staff").select("id, email, full_name").eq("id", data.staff_id)
    : admin.from("sd_lead_staff").select("id, email, full_name").eq("email", data.staff_email!);
  const { data: staff } = await staffQuery.maybeSingle();
  if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

  // Resolve template
  const { data: template } = await admin
    .from("sd_lead_email_templates")
    .select("id, name")
    .eq("id", data.template_id)
    .maybeSingle();
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const title = `${template.name} — ${prospect.name}${prospect.company ? ` · ${prospect.company}` : ""}`;

  const { data: task, error } = await admin
    .from("sd_lead_tasks")
    .insert({
      prospect_id: prospect.id,
      staff_id: staff.id,
      type: "email_send",
      title,
      description: data.description ?? null,
      due_at: data.due_at ?? null,
      template_jsonb: {
        template_id: template.id,
        honorific: data.honorific ?? null,
      },
    })
    .select("id, status")
    .single();

  if (error || !task) {
    return NextResponse.json(
      { error: error?.message ?? "Insert failed" },
      { status: 500 },
    );
  }

  await admin.from("sd_lead_events").insert({
    task_id: task.id,
    staff_id: staff.id,
    event_type: "task_assigned",
    meta: { template_id: template.id, source: auth.source },
  });

  await notifyTaskAssigned(task.id);

  return NextResponse.json({
    ok: true,
    source: auth.source,
    task: { id: task.id, status: task.status, title },
  });
}
