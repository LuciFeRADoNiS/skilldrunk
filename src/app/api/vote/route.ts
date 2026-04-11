import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  skillId: z.string().uuid(),
  value: z.union([z.literal(1), z.literal(-1)]),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { skillId, value } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check if vote exists already.
  const { data: existing } = await supabase
    .from("sd_votes")
    .select("value")
    .eq("skill_id", skillId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    if (existing.value === value) {
      // Same direction → toggle off.
      const { error } = await supabase
        .from("sd_votes")
        .delete()
        .eq("skill_id", skillId)
        .eq("user_id", user.id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, vote: 0 });
    }
    // Switch direction.
    const { error } = await supabase
      .from("sd_votes")
      .update({ value })
      .eq("skill_id", skillId)
      .eq("user_id", user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, vote: value });
  }

  // Fresh vote.
  const { error } = await supabase
    .from("sd_votes")
    .insert({ skill_id: skillId, user_id: user.id, value });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, vote: value });
}
