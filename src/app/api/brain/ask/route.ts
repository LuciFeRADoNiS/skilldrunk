// /api/brain/ask — Faz 4 §1.3
//
// Server-Sent Events stream. Body: { query, realm?, limit? }
// Yields chunks { type: 'sources'|'delta'|'done'|'error', ... }.
//
// Consumer: /ask page (AskPanel client component) — EventSource bağlantısı
// veya fetch + ReadableStream parse. SSE format chosen since EventSource is
// the most ergonomic browser API for one-way streams.

import { NextResponse } from "next/server";
import { askBrainServer } from "@skilldrunk/brain-client/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // Haiku stream + embed ~5sn, geniş margin

function sseChunk(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!openaiKey || !anthropicKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY or ANTHROPIC_API_KEY missing" },
      { status: 500 },
    );
  }

  let body: { query?: string; realm?: "work" | "personal" | "shared" | "auto"; limit?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }
  const query = (body.query ?? "").trim();
  if (!query) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  // Auth gate — owner shell consumer; brain RPC zaten authenticated rolüne RLS
  // veriyor (D-019 spec). Anon erişimi yok.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  // SSE response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const gen = askBrainServer({
          query,
          realm: body.realm,
          domain: "skilldrunk",
          limit: body.limit,
          openaiKey,
          anthropicKey,
          supabase,
        });
        for await (const chunk of gen) {
          controller.enqueue(encoder.encode(sseChunk(chunk)));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(
          encoder.encode(sseChunk({ type: "error", error: msg })),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
