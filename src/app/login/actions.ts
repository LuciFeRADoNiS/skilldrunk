"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Password sign-in as a SERVER ACTION — runs signInWithPassword server-side so
 * the session cookie is written via the SSR cookie adapter (reliable, unlike
 * client-side sign-in + router.push). On bad credentials → /login?error=signin.
 * Entry is still gated by requireAdmin (email allowlist + role) on /home.
 */
export async function passwordSignIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "") || "/home";

  if (!email || !password) {
    redirect(`/login?error=signin&next=${encodeURIComponent(next)}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error("password sign-in error:", error.message);
    redirect(`/login?error=signin&next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}
