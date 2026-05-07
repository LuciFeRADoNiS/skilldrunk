import { redirect } from "next/navigation";
import { createServerClient } from "@skilldrunk/supabase/server";

/**
 * tasks.skilldrunk.com auth guard. Admin-only (cookie SSO from .skilldrunk.com).
 * Redirects:
 *   - Unauthenticated → admin.skilldrunk.com/login?next=<full url>
 *   - Authenticated non-admin → /unauthorized
 */
export async function requireAdmin(currentPath: string = "/") {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = `https://admin.skilldrunk.com/login?next=${encodeURIComponent(
      `https://tasks.skilldrunk.com${currentPath}`,
    )}`;
    redirect(loginUrl);
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
