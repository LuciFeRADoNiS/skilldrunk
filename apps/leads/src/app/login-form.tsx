"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: redirectTo,
      },
    });

    // Show generic success regardless to avoid email enumeration
    if (otpError && !/not found|invalid/i.test(otpError.message)) {
      setError("Bir sorun oluştu. Tekrar deneyin.");
    } else {
      setSent(true);
    }
    setSending(false);
  }

  if (sent) {
    return (
      <div className="rounded-md border border-emerald-800 bg-emerald-950/30 px-4 py-4 text-sm text-emerald-300">
        Giriş bağlantısı e-postanıza gönderildi. Mailinizi kontrol edin.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-xs uppercase tracking-wider text-neutral-400">
          E-posta
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="adiniz@enco.com.tr"
          className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-orange-500 focus:outline-none"
        />
      </div>
      {error && (
        <p className="rounded-md border border-red-900 bg-red-950/30 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={sending || !email}
        className="w-full rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sending ? "Gönderiliyor..." : "Giriş bağlantısı gönder"}
      </button>
    </form>
  );
}
