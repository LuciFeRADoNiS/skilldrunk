import { NextResponse } from "next/server";
import { z } from "zod";
import { checkIngestAuth } from "@/lib/ingest-auth";
import { createServiceRoleClient } from "@/lib/supabase-admin";

const prospectSchema = z.object({
  apollo_id: z.string().optional().nullable(),
  name: z.string().min(1).max(300),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  title: z.string().max(300).optional().nullable(),
  company: z.string().max(300).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  industry: z.string().max(200).optional().nullable(),
  score: z.number().int().min(0).max(100).optional().nullable(),
  linkedin_url: z.string().url().optional().nullable(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

const payloadSchema = z.object({
  prospects: z.array(prospectSchema).min(1).max(500),
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

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const admin = createServiceRoleClient();
  const now = new Date().toISOString();

  const rows = parsed.data.prospects.map((p) => ({
    apollo_id: p.apollo_id ?? null,
    name: p.name,
    email: p.email ?? null,
    phone: p.phone ?? null,
    title: p.title ?? null,
    company: p.company ?? null,
    city: p.city ?? null,
    industry: p.industry ?? null,
    score: p.score ?? null,
    linkedin_url: p.linkedin_url ?? null,
    meta: p.meta ?? {},
    imported_at: now,
    imported_from: "apollo",
  }));

  // Split rows that have apollo_id (upsert by apollo_id) from rows without (insert only)
  const withApolloId = rows.filter((r) => r.apollo_id);
  const withoutApolloId = rows.filter((r) => !r.apollo_id);

  const results = { upserted: 0, inserted: 0, errors: [] as string[] };

  if (withApolloId.length > 0) {
    const { data, error } = await admin
      .from("sd_lead_prospects")
      .upsert(withApolloId, { onConflict: "apollo_id" })
      .select("id");
    if (error) results.errors.push(`upsert: ${error.message}`);
    else results.upserted = data?.length ?? 0;
  }

  if (withoutApolloId.length > 0) {
    const { data, error } = await admin
      .from("sd_lead_prospects")
      .insert(withoutApolloId)
      .select("id");
    if (error) results.errors.push(`insert: ${error.message}`);
    else results.inserted = data?.length ?? 0;
  }

  return NextResponse.json({
    ok: results.errors.length === 0,
    source: auth.source,
    upserted: results.upserted,
    inserted: results.inserted,
    errors: results.errors,
  });
}
