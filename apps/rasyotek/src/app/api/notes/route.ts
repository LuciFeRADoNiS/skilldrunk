import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@skilldrunk/supabase/server";
import { adminClient } from "@/lib/context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.body_md?.trim())
    return NextResponse.json({ error: "body_md required" }, { status: 400 });

  const sb = adminClient();
  const { data, error } = await sb
    .from("rt_notes")
    .insert({
      user_id: user.id,
      note_type: body.note_type ?? "observation",
      title: body.title || null,
      body_md: body.body_md,
      meeting_date: body.meeting_date || null,
      related_doc_key: body.related_doc_key || null,
      source: "web",
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ note: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const sb = adminClient();
  const { error } = await sb
    .from("rt_notes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
