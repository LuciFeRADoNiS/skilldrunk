import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/owner/allowlist";

// OAuth / magic link callback — exchanges the PKCE code for a session cookie,
// ensures the sd_profiles row exists (safety net for pre-existing auth.users
// rows the on_auth_user_created_skilldrunk INSERT trigger never fired on),
// then redirects to `next`.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("auth callback exchange error", exchangeError);
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // Idempotent: creates the row if missing, no-op otherwise.
  const { error: rpcError } = await supabase.rpc("sd_ensure_profile");
  if (rpcError) {
    console.error("sd_ensure_profile rpc error (non-fatal)", rpcError);
  }

  // Private apex (D6 / G10): two-gate allowlist. Anyone not authorized is signed
  // OUT — clearing the shared .skilldrunk.com cookie so a rejected user can't hold
  // a session on any sibling subdomain — then bounced.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Gate 1: explicit email allowlist (SD_ALLOWED_EMAILS, default curator only).
  if (!isAllowedEmail(user?.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=access_denied`);
  }
  // Gate 2: role must be admin (also enforced by RLS for data reads).
  const { data: profile } = user
    ? await supabase.from("sd_profiles").select("role").eq("id", user.id).single()
    : { data: null };
  if (profile?.role !== "admin") {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=access_denied`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
