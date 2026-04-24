"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@skilldrunk/supabase/server";

async function adminSupabase() {
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

export async function toggleAppFeatured(id: string) {
  const supabase = await adminSupabase();
  const { data } = await supabase
    .from("pt_apps")
    .select("featured")
    .eq("id", id)
    .single();
  await supabase
    .from("pt_apps")
    .update({ featured: !(data?.featured ?? false) })
    .eq("id", id);
  revalidatePath("/apps");
}

export async function toggleAppPublic(id: string) {
  const supabase = await adminSupabase();
  const { data } = await supabase
    .from("pt_apps")
    .select("is_public")
    .eq("id", id)
    .single();
  await supabase
    .from("pt_apps")
    .update({ is_public: !(data?.is_public ?? false) })
    .eq("id", id);
  revalidatePath("/apps");
}

export async function setAppStatus(id: string, status: "live" | "draft" | "archived") {
  const supabase = await adminSupabase();
  await supabase.from("pt_apps").update({ status }).eq("id", id);
  revalidatePath("/apps");
}
