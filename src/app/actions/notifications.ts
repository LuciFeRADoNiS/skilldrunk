"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
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
  return { supabase, user };
}

export type NotificationRow = {
  id: number;
  kind: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  read: boolean;
  created_at: string;
};

export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("sd_notification_count");
  return (data as number) ?? 0;
}

export async function getNotifications(limit = 20): Promise<NotificationRow[]> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("sd_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as NotificationRow[];
}

export async function markAllRead() {
  const { supabase } = await requireAdmin();
  await supabase
    .from("sd_notifications")
    .update({ read: true })
    .eq("read", false);
  revalidatePath("/admin");
  return { ok: true };
}

export async function markRead(id: number) {
  const { supabase } = await requireAdmin();
  await supabase
    .from("sd_notifications")
    .update({ read: true })
    .eq("id", id);
  revalidatePath("/admin");
  return { ok: true };
}
