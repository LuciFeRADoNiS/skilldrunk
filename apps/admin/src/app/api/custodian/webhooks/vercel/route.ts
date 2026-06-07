// /api/custodian/webhooks/vercel — Faz 1 PR-B
//
// Vercel deployment webhook → cst_events (type=deploy).
// Vercel signs the raw body with HMAC-SHA1 using the webhook secret;
// header `x-vercel-signature`. We verify on the RAW body bytes.
//
// Setup (USER, Vercel dashboard): Account/Team Settings → Webhooks →
// add endpoint https://admin.skilldrunk.com/api/custodian/webhooks/vercel,
// events: deployment.created/.succeeded/.error/.canceled. Copy the secret
// into env CUSTODIAN_VERCEL_WEBHOOK_SECRET (admin project).
//
// Middleware does NOT auth-gate /api/* (verified: updateSession only
// refreshes cookie). This route self-verifies via HMAC.

import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { logEvent } from "@/lib/custodian/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha1", secret).update(rawBody).digest("hex");
  // timingSafeEqual throws on length mismatch — guard first
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

interface VercelWebhookPayload {
  type?: string; // 'deployment.succeeded' ...
  payload?: {
    deployment?: { id?: string; url?: string; name?: string; meta?: Record<string, unknown> };
    project?: { id?: string; name?: string };
    target?: string | null;
    user?: { id?: string };
  };
  createdAt?: number;
}

export async function POST(req: Request) {
  const secret = process.env.CUSTODIAN_VERCEL_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CUSTODIAN_VERCEL_WEBHOOK_SECRET not configured" },
      { status: 500 },
    );
  }

  // Read raw body for HMAC — must not JSON.parse before verifying.
  const rawBody = await req.text();
  const sig = req.headers.get("x-vercel-signature");
  if (!verifySignature(rawBody, sig, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: VercelWebhookPayload;
  try {
    body = JSON.parse(rawBody) as VercelWebhookPayload;
  } catch {
    return NextResponse.json({ ok: true }); // ack malformed, don't retry-storm
  }

  const evType = body.type ?? "deployment.unknown";
  const dep = body.payload?.deployment;
  const proj = body.payload?.project;

  await logEvent({
    type: "deploy",
    source: "vercel",
    actor: proj?.name ?? "vercel",
    payload: {
      event: evType,
      project: proj?.name ?? null,
      project_id: proj?.id ?? null,
      deployment_id: dep?.id ?? null,
      url: dep?.url ?? null,
      target: body.payload?.target ?? null,
      commit_msg: (dep?.meta?.githubCommitMessage as string | undefined) ?? null,
      commit_ref: (dep?.meta?.githubCommitRef as string | undefined) ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
