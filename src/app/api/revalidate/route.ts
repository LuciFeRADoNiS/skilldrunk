// /api/revalidate — Faz 3 PR-G (marketplace)
//
// Custodian'ın revalidate_path aksiyonunun hedefi. revalidatePath() yalnız
// çalıştığı app'in ISR cache'ini etkilediği için bu endpoint MARKETPLACE
// app'inde (skilldrunk.com) yaşar — admin custodian buraya secret'lı POST atar.
//
// Çağrı: POST /api/revalidate?path=/feed&secret=<CUSTODIAN_REVALIDATE_SECRET>
// Dinamik route pattern'i için: ?path=/s/[slug]&type=page
//
// Secret env: CUSTODIAN_REVALIDATE_SECRET (admin + marketplace projelerinde aynı).

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.CUSTODIAN_REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CUSTODIAN_REVALIDATE_SECRET not configured" },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const given = url.searchParams.get("secret");
  if (given !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const path = url.searchParams.get("path");
  if (!path || !path.startsWith("/")) {
    return NextResponse.json({ error: "path required (must start with /)" }, { status: 400 });
  }

  // type: 'page' | 'layout' — dynamic route patterns ('/s/[slug]') need 'page'.
  const typeParam = url.searchParams.get("type");
  const type = typeParam === "layout" ? "layout" : typeParam === "page" ? "page" : undefined;

  try {
    if (type) {
      revalidatePath(path, type);
    } else {
      revalidatePath(path);
    }
    return NextResponse.json({ ok: true, revalidated: path, type: type ?? "auto" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
