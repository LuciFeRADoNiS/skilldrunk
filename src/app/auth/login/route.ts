import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Password sign-in as a ROUTE HANDLER (not a server action). Mirrors the proven
// /auth/callback flow: createClient → auth call → cookies set via the SSR adapter
// → NextResponse.redirect carries the Set-Cookie. This reliably establishes the
// session for the redirect to /home (the server-action variant left getUser null
// on /home → silent bounce). Entry is still gated by requireAdmin.
export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "") || "/home";

  if (!email || !password) {
    return NextResponse.redirect(`${origin}/login?error=signin`, 303);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error("password login error:", error.message);
    return NextResponse.redirect(`${origin}/login?error=signin`, 303);
  }

  return NextResponse.redirect(`${origin}${next}`, 303);
}
