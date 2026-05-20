import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@skilldrunk/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(new URL("/?error=missing_code", url.origin));
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/?error=auth_failed", url.origin));
  }

  // Log staff login + bind user_id to sd_lead_staff if not yet linked
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const admin = createServiceRoleClient();
    // Bind auth.users.id to sd_lead_staff row if email matches (first login)
    const { data: staffRow } = await admin
      .from("sd_lead_staff")
      .select("id, user_id")
      .eq("email", user.email)
      .maybeSingle();

    if (staffRow && !staffRow.user_id) {
      await admin
        .from("sd_lead_staff")
        .update({ user_id: user.id })
        .eq("id", staffRow.id);
    }

    if (staffRow) {
      await admin.from("sd_lead_events").insert({
        staff_id: staffRow.id,
        event_type: "staff_logged_in",
        meta: {},
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        user_agent: request.headers.get("user-agent") ?? null,
      });
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
