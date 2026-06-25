// /api/brain/mood/write — Faz 4 §1.6
//
// KlauX VPS bot (or any external writer) → brain_kpi_snapshot mirror.
// Service-token gated (header `x-mood-secret`); Bearer Supabase auth yok
// çünkü VPS bot user session açmıyor.
//
// Body:
//   { mood: 0-10, stress?: 0-10, snapshot_at?: ISO-string }
//
// Idempotent: aynı snapshot_at + metric_key kombinasyonu zaten varsa skip
// (unique constraint olmadığı için manuel check + insert).
//
// D-038 mirror pattern: kpi_name='mood' / 'stress', realm='personal'.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SECRET_ENV = "BRAIN_MOOD_WRITE_SECRET"; // Vercel env'de set'lenir; KlauX VPS aynı string'i header'da yollar

function clamp(n: unknown): number | null {
  if (typeof n !== "number" || Number.isNaN(n)) return null;
  return Math.max(0, Math.min(10, n));
}

export async function POST(req: Request) {
  const secret = process.env[SECRET_ENV];
  if (!secret) {
    return NextResponse.json(
      { error: `${SECRET_ENV} not configured` },
      { status: 500 },
    );
  }
  const got = req.headers.get("x-mood-secret");
  if (got !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { mood?: unknown; stress?: unknown; snapshot_at?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const mood = clamp(body.mood);
  if (mood === null) {
    return NextResponse.json({ error: "mood (0-10) required" }, { status: 400 });
  }
  const stress = clamp(body.stress);
  const at =
    typeof body.snapshot_at === "string"
      ? body.snapshot_at
      : new Date().toISOString();

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY missing" },
      { status: 500 },
    );
  }
  const rows: Array<{ realm: "personal"; metric_key: string; metric_value: number; captured_at: string }> = [
    { realm: "personal", metric_key: "mood", metric_value: mood, captured_at: at },
  ];
  if (stress !== null) {
    rows.push({
      realm: "personal",
      metric_key: "stress",
      metric_value: stress,
      captured_at: at,
    });
  }

  const { error } = await supabase.from("brain_kpi_snapshot").insert(rows);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, inserted: rows.length, captured_at: at });
}
