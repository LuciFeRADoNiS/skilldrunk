"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@skilldrunk/supabase/server";

async function getSupabase() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");
  const { data: profile } = await supabase
    .from("sd_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("not_authorized");
  return supabase;
}

export async function updateSkillStatus(
  skillId: string,
  status: "published" | "archived" | "draft"
) {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("sd_skills")
    .update({ status })
    .eq("id", skillId);
  if (error) throw new Error(error.message);
  revalidatePath("/skills");
  return { ok: true };
}

export async function updateUserRole(
  userId: string,
  role: "user" | "moderator" | "admin"
) {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("sd_profiles")
    .update({ role })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/users");
  return { ok: true };
}

export async function updateReportStatus(
  reportId: string,
  status: "reviewed" | "actioned" | "dismissed"
) {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("sd_reports")
    .update({ status })
    .eq("id", reportId);
  if (error) throw new Error(error.message);
  revalidatePath("/reports");
  return { ok: true };
}
