"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@skilldrunk/supabase/server";

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function signInWithPassword(
  email: string,
  password: string,
  next: string = "/"
): Promise<LoginResult> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  // Check admin role — non-admin should not sign into admin subdomain
  const { data: profile } = await supabase
    .from("sd_profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profile?.role !== "admin") {
    await supabase.auth.signOut();
    return { ok: false, error: "Bu alan sadece admin kullanıcılar içindir." };
  }

  redirect(next || "/");
}

export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(email: string) {
  const supabase = await createServerClient();
  const redirectTo = "https://admin.skilldrunk.com/reset-password/confirm";
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function updatePassword(newPassword: string) {
  const supabase = await createServerClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return error ? { ok: false, error: error.message } : { ok: true };
}
