// /api/custodian/webhooks/github — Faz 1 PR-B
//
// GitHub push webhook → cst_events (type=commit).
// GitHub signs the raw body with HMAC-SHA256; header
// `x-hub-signature-256: sha256=<hex>`. Verify on raw bytes.
//
// Setup (USER, GitHub repo settings): Settings → Webhooks → Add webhook,
// Payload URL https://admin.skilldrunk.com/api/custodian/webhooks/github,
// Content type application/json, Secret = env CUSTODIAN_GITHUB_WEBHOOK_SECRET
// (admin project), events: "Just the push event" (+ optionally deployment).

import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { logEvent } from "@/lib/custodian/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !signature.startsWith("sha256=")) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

interface GithubPushPayload {
  ref?: string;
  repository?: { full_name?: string };
  pusher?: { name?: string };
  head_commit?: { id?: string; message?: string; url?: string; author?: { name?: string } };
  commits?: Array<{ id: string; message: string }>;
}

export async function POST(req: Request) {
  const secret = process.env.CUSTODIAN_GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CUSTODIAN_GITHUB_WEBHOOK_SECRET not configured" },
      { status: 500 },
    );
  }

  const rawBody = await req.text();
  const sig = req.headers.get("x-hub-signature-256");
  if (!verifySignature(rawBody, sig, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const ghEvent = req.headers.get("x-github-event") ?? "unknown";
  // ping event on first setup — ack without logging.
  if (ghEvent === "ping") {
    return NextResponse.json({ ok: true, pong: true });
  }

  let body: GithubPushPayload;
  try {
    body = JSON.parse(rawBody) as GithubPushPayload;
  } catch {
    return NextResponse.json({ ok: true });
  }

  if (ghEvent === "push") {
    await logEvent({
      type: "commit",
      source: "github",
      actor: body.pusher?.name ?? body.head_commit?.author?.name ?? "github",
      payload: {
        repo: body.repository?.full_name ?? null,
        ref: body.ref ?? null,
        head_commit_id: body.head_commit?.id ?? null,
        head_commit_msg: body.head_commit?.message ?? null,
        head_commit_url: body.head_commit?.url ?? null,
        commit_count: body.commits?.length ?? 0,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
