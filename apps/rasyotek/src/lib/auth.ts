import { redirect } from "next/navigation";
import { createServerClient } from "@skilldrunk/supabase/server";

/**
 * Private subdomain auth — rasyotek.skilldrunk.com.
 * - Unauthenticated users → central private login at admin.skilldrunk.com/login
 * - Only admin-role users pass (rasyotek is Özgür's personal strategic tool)
 *
 * Community users who sign into skilldrunk.com with Google won't have admin role
 * and won't be able to access this subdomain — which is intentional.
 */
export async function requireUser(currentPath: string = "/") {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const adminUrl =
      process.env.NEXT_PUBLIC_ADMIN_URL ?? "https://admin.skilldrunk.com";
    const returnTo = `https://rasyotek.skilldrunk.com${currentPath}`;
    redirect(`${adminUrl}/login?next=${encodeURIComponent(returnTo)}`);
  }

  // Require admin role for private subdomains
  const { data: profile } = await supabase
    .from("sd_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    const adminUrl =
      process.env.NEXT_PUBLIC_ADMIN_URL ?? "https://admin.skilldrunk.com";
    redirect(`${adminUrl}/unauthorized`);
  }

  return { supabase, user };
}
