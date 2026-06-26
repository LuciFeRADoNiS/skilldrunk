"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

/**
 * Private apex login. The curator's account is email/password (provider=email),
 * so the primary path is email + password. A passwordless magic-link (email OTP)
 * is the backup. Either way the email allowlist + role gate (auth/callback +
 * requireAdmin) ensures only authorized emails get in.
 */
export function SignInButtons({ next }: { next?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sentLink, setSentLink] = useState(false);
  const supabase = createClient();

  function signInPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    startTransition(async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      router.push(next || "/home");
      router.refresh();
    });
  }

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
    <form onSubmit={signInPassword} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input
        type="email"
        autoComplete="email"
        placeholder="e-posta"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={pending}
        required
        style={inputStyle}
      />
      <input
        type="password"
        autoComplete="current-password"
        placeholder="şifre"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={pending}
        style={inputStyle}
      />
      <button
        type="submit"
        disabled={pending || !email.trim() || !password}
        style={{
          height: 48,
          borderRadius: "var(--radius, 10px)",
          border: "none",
          background: "var(--accent)",
          color: "var(--accent-contrast)",
          fontSize: 15,
          fontWeight: 600,
          cursor: pending ? "wait" : "pointer",
        }}
      >
        {pending ? "Giriliyor…" : "Gir"}
      </button>

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
    </form>
  );
}
