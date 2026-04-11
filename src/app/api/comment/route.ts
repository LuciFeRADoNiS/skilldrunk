import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  skillId: z.string().uuid(),
  body: z.string().min(1).max(10_000),
  parentId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("sd_comments")
    .insert({
      skill_id: parsed.data.skillId,
      parent_id: parsed.data.parentId ?? null,
      author_id: user.id,
      body_md: parsed.data.body,
    })
    .select("*, author:sd_profiles!sd_comments_author_id_fkey(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, comment: data });
}
