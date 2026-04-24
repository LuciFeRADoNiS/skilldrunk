"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@skilldrunk/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { composeBrief } from "@/lib/compose";

export async function generateBriefNow(date?: string) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const { data: profile } = await supabase
    .from("sd_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("forbidden");

  const admin = createAdminClient();
  if (!admin) throw new Error("admin_client_missing");

  const d = date ?? new Date().toISOString().slice(0, 10);
  const result = await composeBrief(supabase, user.id, d);
  await admin.from("br_briefings").upsert(
    {
      user_id: user.id,
      brief_date: d,
      model: result.model,
      summary: result.summary,
      body_md: result.body_md,
      metadata: result.metadata,
    },
    { onConflict: "user_id,brief_date" },
  );

  redirect(`/daily/${d}`);
}
