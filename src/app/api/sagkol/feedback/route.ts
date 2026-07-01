import { NextRequest, NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon";

// Merkezî Sağkol geri-bildirim hattı ("Sağkol'u besle").
// Her Sağkol kurulumu buraya POST eder → sd_backlog (source='sagkol', project='sagkol').
// Anon key install'lara dağıtılmaz; tek public uç. Tüm mülklerden CORS ile erişilir.
export const runtime = "nodejs";

const KINDS = ["request", "suggestion", "bug", "gap", "note"] as const;
type Kind = (typeof KINDS)[number];

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-sagkol-token",
};

const BACKLOG_URL = "https://admin.skilldrunk.com/backlog?project=sagkol";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CORS });
}

function clean(s: unknown, max: number): string {
  return String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  // Opsiyonel kilit: SAGKOL_FEEDBACK_TOKEN set ise x-sagkol-token eşleşmeli.
  const token = process.env.SAGKOL_FEEDBACK_TOKEN;
  if (token && req.headers.get("x-sagkol-token") !== token) {
    return json({ error: "unauthorized" }, 401);
  }

  let body: { project?: string; title?: string; body?: string; kind?: string; tags?: string[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const kind: Kind = (KINDS as readonly string[]).includes(String(body.kind)) ? (body.kind as Kind) : "note";
  const from = clean(body.project, 60) || "unknown";
  let title = clean(body.title, 200);
  const detail = clean(body.body, 400);
  if (!title) title = detail.slice(0, 200);
  if (title.length < 3) {
    return json({ error: "title/body required (min 3 chars)" }, 400);
  }
  // RPC yalnız title alır; kısa detayı başlığa iliştir (≤200); kaynak+tür tag'de.
  if (detail && title.length < 160 && !title.includes(detail.slice(0, 40))) {
    title = `${title} — ${detail}`.slice(0, 200);
  }
  const extraTags = Array.isArray(body.tags)
    ? body.tags.slice(0, 5).map((t) => clean(t, 24)).filter(Boolean)
    : [];
  const tags = ["feedback", kind, `from:${from}`, ...extraTags];

  const supabase = createAnonClient();
  const args = {
    p_title: title,
    p_project: "sagkol",
    p_priority: 3,
    p_source: "sagkol" as string,
    p_status: "idea" as string,
    p_tags: tags,
  };
  let { data, error } = await supabase.rpc("sd_backlog_add", args);
  if (error) {
    // 'sagkol' enum değeri henüz uygulanmadıysa güvenli geri düşüş.
    ({ data, error } = await supabase.rpc("sd_backlog_add", {
      ...args,
      p_source: "import",
      p_tags: [...tags, "source-pending"],
    }));
    if (error) return json({ error: "backlog write failed" }, 502);
  }
  return json({ ok: true, id: (data as { id?: number })?.id, url: BACKLOG_URL });
}
