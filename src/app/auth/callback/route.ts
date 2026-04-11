import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  return NextResponse.redirect(`${origin}${next}`);
}
