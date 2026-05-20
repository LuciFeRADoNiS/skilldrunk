import { redirect } from "next/navigation";
import { createServerClient } from "@skilldrunk/supabase/server";

/**
 * Get the current Supabase user + their lead-portal role.
 * Role resolution:
 *   - 'admin'  → sd_profiles.role = 'admin'   (Özgür)
 *   - 'staff'  → sd_lead_staff.user_id matches, active = true
 *   - 'none'   → authenticated but not authorized for the portal
 *   - null     → not authenticated
 */
export type LeadRole = "admin" | "staff" | "none";

export async function getSessionRole(): Promise<{
  supabase: Awaited<ReturnType<typeof createServerClient>>;
  user: { id: string; email: string | null } | null;
  role: LeadRole | null;
  staffId: number | null;
}> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, role: null, staffId: null };
  }

  const [{ data: profile }, { data: staff }] = await Promise.all([
    supabase.from("sd_profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase
      .from("sd_lead_staff")
      .select("id, active")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const role: LeadRole =
    profile?.role === "admin"
      ? "admin"
      : staff?.active
        ? "staff"
        : "none";

  return {
    supabase,
    user: { id: user.id, email: user.email ?? null },
    role,
    staffId: staff?.id ?? null,
  };
}

type AuthedSession = Awaited<ReturnType<typeof getSessionRole>> & {
  user: NonNullable<Awaited<ReturnType<typeof getSessionRole>>["user"]>;
};

export async function requireAdmin(): Promise<AuthedSession> {
  const ctx = await getSessionRole();
  if (!ctx.user) redirect("/");
  if (ctx.role !== "admin") redirect("/unauthorized");
  return ctx as AuthedSession;
}

export async function requireStaff(): Promise<AuthedSession & { staffId: number }> {
  const ctx = await getSessionRole();
  if (!ctx.user) redirect("/");
  if (ctx.role !== "staff" || ctx.staffId == null) redirect("/unauthorized");
  return ctx as AuthedSession & { staffId: number };
}
