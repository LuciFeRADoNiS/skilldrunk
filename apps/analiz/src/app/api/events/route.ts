import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@skilldrunk/supabase/server";

const ALLOWED_SOURCES = [
  "obsidian",
  "github",
  "calendar",
  "manual",
  "other",
] as const;

type IngestEvent = {
  source?: string;
  kind?: string;
  title?: string;
  body?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
  occurred_at?: string;
  external_id?: string | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalize(
  e: IngestEvent,
  userId: string
): Record<string, unknown> | { error: string } {
  if (!e.kind || typeof e.kind !== "string") return { error: "kind required" };
  if (!e.title || typeof e.title !== "string")
    return { error: "title required" };
  const src = e.source ?? "manual";
  if (!(ALLOWED_SOURCES as readonly string[]).includes(src))
    return { error: `invalid source: ${src}` };

  return {
    user_id: userId,
    source: src,
    kind: e.kind.slice(0, 100),
    title: e.title.slice(0, 500),
    body: typeof e.body === "string" ? e.body.slice(0, 10000) : null,
    tags: Array.isArray(e.tags)
      ? e.tags.filter((t): t is string => typeof t === "string").slice(0, 32)
      : [],
    metadata: isRecord(e.metadata) ? e.metadata : {},
    occurred_at:
      typeof e.occurred_at === "string"
        ? e.occurred_at
        : new Date().toISOString(),
    external_id:
      typeof e.external_id === "string" ? e.external_id.slice(0, 200) : null,
  };
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Accept single event or { events: [...] }
  const events: IngestEvent[] = Array.isArray(payload)
    ? (payload as IngestEvent[])
    : isRecord(payload) && Array.isArray(payload.events)
      ? (payload.events as IngestEvent[])
      : isRecord(payload)
        ? [payload as IngestEvent]
        : [];

  if (events.length === 0) {
    return NextResponse.json({ error: "no_events" }, { status: 400 });
  }
  if (events.length > 500) {
    return NextResponse.json(
      { error: "too_many_events", max: 500 },
      { status: 400 }
    );
  }

  const normalized: Record<string, unknown>[] = [];
  for (const e of events) {
    const n = normalize(e, user.id);
    if ("error" in n) {
      return NextResponse.json(n, { status: 400 });
    }
    normalized.push(n);
  }

  const { data, error } = await supabase
    .from("az_events")
    .upsert(normalized, {
      onConflict: "user_id,source,external_id",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    inserted: data?.length ?? 0,
    total: normalized.length,
  });
}

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const source = searchParams.get("source");
  const limit = Math.min(500, parseInt(searchParams.get("limit") ?? "50") || 50);

  let query = supabase
    .from("az_events")
    .select(
      "id, source, kind, title, body, tags, metadata, occurred_at, created_at"
    )
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (source && (ALLOWED_SOURCES as readonly string[]).includes(source)) {
    query = query.eq("source", source);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data ?? [] });
}
