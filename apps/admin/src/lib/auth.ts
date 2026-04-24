import { redirect } from "next/navigation";
import { createServerClient } from "@skilldrunk/supabase/server";

/**
 * Admin auth guard. Redirects:
 *  - Unauthenticated → /login?next=<current>
 *  - Authenticated but not admin → /unauthorized
 */
export async function requireAdmin(currentPath: string = "/") {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(currentPath)}`);
  }

  const { data: profile } = await supabase
    .from("sd_profiles")
    .select("id, username, display_name, avatar_url, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/unauthorized");
  }

  return { supabase, user, profile };
}

/** Lighter guard — any authenticated user. */
export async function requireAuth(currentPath: string = "/") {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(currentPath)}`);
  }
  return { supabase, user };
}
