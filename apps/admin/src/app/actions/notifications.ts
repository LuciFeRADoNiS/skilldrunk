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

export async function markAllRead() {
  const supabase = await adminSupabase();
  await supabase.from("sd_notifications").update({ read: true }).eq("read", false);
  revalidatePath("/notifications");
  revalidatePath("/");
  return { ok: true };
}

export async function markOneRead(id: number) {
  const supabase = await adminSupabase();
  await supabase.from("sd_notifications").update({ read: true }).eq("id", id);
  revalidatePath("/notifications");
  revalidatePath("/");
  return { ok: true };
}
