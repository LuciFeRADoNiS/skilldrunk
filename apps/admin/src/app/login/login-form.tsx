"use client";

import { useState, type FormEvent } from "react";
import { createBrowserClient } from "@skilldrunk/supabase/client";

/**
 * Client-side login — bypasses Next.js server actions which were hanging
 * silently on Vercel. @supabase/ssr browser client handles cookies directly.
 * Admin role check happens server-side on next navigation (requireAdmin).
 */
export function LoginForm({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    const form = e.currentTarget;
    const fd = new FormData(form);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");

    setError(null);
    setPending(true);

    try {
      const supabase = createBrowserClient();
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInErr) {
        setError(signInErr.message);
        setPending(false);
        return;
      }

      // Navigate via full reload so the fresh auth cookie goes with the next
      // request and requireAdmin sees the user. Role is enforced server-side.
      const target =
        next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
      window.location.assign(target);
    } catch (err) {
      console.error("[login] exception:", err);
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-wider text-neutral-500">
          Email
        </label>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          autoFocus
          placeholder="ozgurgur@gmail.com"
          className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm placeholder:text-neutral-600 focus:border-orange-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-wider text-neutral-500">
          Şifre
        </label>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm placeholder:text-neutral-600 focus:border-orange-500 focus:outline-none"
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-900 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
      >
        {pending ? "Giriş yapılıyor…" : "Giriş Yap"}
      </button>
    </form>
  );
}
