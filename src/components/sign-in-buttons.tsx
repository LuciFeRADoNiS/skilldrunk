"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { passwordSignIn } from "@/app/login/actions";

/**
 * Private apex login. Primary: email + password via a SERVER ACTION
 * (passwordSignIn) — reliable SSR cookie + real errors. Backup: passwordless
 * magic-link (email OTP) client-side → /auth/callback. Either way the email
 * allowlist + role gate ensures only authorized emails get in.
 */
export function SignInButtons({ next }: { next?: string }) {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [sentLink, setSentLink] = useState(false);
  const supabase = createClient();

  function magicLink() {
    if (!email.trim()) {
      toast.error("Önce e-posta gir");
      return;
    }
    startTransition(async () => {
      const redirectTo = new URL("/auth/callback", window.location.origin);
      if (next) redirectTo.searchParams.set("next", next);
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo.toString() },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setSentLink(true);
      toast.success("Giriş linki e-postana gönderildi.");
    });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    height: 46,
    padding: "0 14px",
    borderRadius: "var(--radius, 10px)",
    border: "1px solid var(--line)",
    background: "var(--bg-soft)",
    color: "var(--ink)",
    fontSize: 15,
    outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Password sign-in → server action (reliable). */}
      <form action={passwordSignIn} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {next && <input type="hidden" name="next" value={next} />}
        <input
          type="email"
          name="email"
          autoComplete="email"
          placeholder="e-posta"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="şifre"
          required
          style={inputStyle}
        />
        <button
          type="submit"
          style={{
            height: 48,
            borderRadius: "var(--radius, 10px)",
            border: "none",
            background: "var(--accent)",
            color: "var(--accent-contrast)",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Gir
        </button>
      </form>

      {/* Passwordless backup → magic link via /auth/callback. */}
      <button
        type="button"
        onClick={magicLink}
        disabled={pending || sentLink}
        style={{
          height: 42,
          borderRadius: "var(--radius, 10px)",
          border: "1px solid var(--line)",
          background: "transparent",
          color: "var(--ink-soft)",
          fontSize: 13,
          cursor: pending ? "wait" : "pointer",
        }}
      >
        {sentLink ? "Link gönderildi — e-postana bak" : "Şifresiz: e-posta ile giriş linki gönder"}
      </button>
    </div>
  );
}
