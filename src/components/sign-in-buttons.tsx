"use client";

import { useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

/**
 * Private apex — the ONLY sign-in path is Google OAuth. The server-side email
 * allowlist (src/lib/owner/allowlist.ts, enforced in auth/callback +
 * requireAdmin) decides who actually gets in; everyone else is signed out
 * immediately. Magic-link and the other OAuth providers were removed to shrink
 * the attack surface.
 */
export function SignInButtons({ next }: { next?: string }) {
  const [pending, startTransition] = useTransition();
  const supabase = createClient();

  function signInGoogle() {
    startTransition(async () => {
      const redirectTo = new URL("/auth/callback", window.location.origin);
      if (next) redirectTo.searchParams.set("next", next);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectTo.toString() },
      });
      if (error) toast.error(error.message);
    });
  }

  return (
    <button
      type="button"
      onClick={signInGoogle}
      disabled={pending}
      style={{
        width: "100%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        height: 48,
        borderRadius: "var(--radius, 10px)",
        border: "1px solid var(--line)",
        background: "var(--accent)",
        color: "var(--accent-contrast)",
        fontSize: 15,
        fontWeight: 500,
        cursor: pending ? "wait" : "pointer",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" opacity=".9" />
        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" opacity=".7" />
        <path fill="currentColor" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" opacity=".5" />
        <path fill="currentColor" d="M12 4.75c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 1.43 14.97.5 12 .5A11 11 0 0 0 2.18 6.56L5.84 9.4C6.71 6.8 9.14 4.75 12 4.75z" />
      </svg>
      {pending ? "Yönlendiriliyor…" : "Google ile gir"}
    </button>
  );
}
