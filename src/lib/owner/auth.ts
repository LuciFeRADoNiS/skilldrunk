import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "./allowlist";

/**
 * Server-side guard for /(owner)/** routes.
 * Returns the logged-in user + supabase client, or redirects to /login.
 */
export async function requireOwner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  return { supabase, user };
}

/**
 * Admin-only guard — the curator (Özgür) and no one else.
 * Mirrors the established server-side pattern (sd_profiles.role === "admin",
 * see todus/actions.ts + api/sagkol/chat). NOT the sd_is_admin() RPC, which is
 * an RLS helper not granted to authenticated clients.
 *
 * This is the lockdown primitive for the private "Mine" apex: any logged-in
 * non-admin (community user) is bounced to /login?error=unauthorized.
 */
export async function requireAdmin(next?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  }
  // Gate 1 (app): explicit email allowlist — only the curator + authorized list.
  if (!isAllowedEmail(user.email)) {
    redirect("/login?error=unauthorized");
  }
  // Gate 2 (DB-backed): role must be admin (also what RLS enforces for reads).
  const { data: profile } = await supabase
    .from("sd_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    redirect("/login?error=unauthorized");
  }
  return { supabase, user };
}
