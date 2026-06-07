"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@skilldrunk/supabase/server";
import { logEvent } from "@/lib/custodian/events";

export type LoginResult =
  | { ok: true; next: string }
  | { ok: false; error: string };

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

  // Custodian auth event (best-effort; never blocks login).
  await logEvent({
    type: "auth",
    source: "admin-login",
    actor: data.user.email ?? data.user.id,
    payload: { action: "login" },
  });

  // Return the target URL so the client can navigate (full reload) after
  // the Set-Cookie headers have arrived. Server-side redirect() inside a
  // useTransition is unreliable in React 19.
  const safeNext = next && next.startsWith("/") ? next : "/";
  return { ok: true, next: safeNext };
}

export async function signOut() {
  const supabase = await createServerClient();
  // Capture actor before the session is torn down.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logEvent({
    type: "auth",
    source: "admin-login",
    actor: user?.email ?? user?.id ?? "unknown",
    payload: { action: "logout" },
  });
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
