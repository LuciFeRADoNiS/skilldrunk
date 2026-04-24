"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@skilldrunk/supabase/client";

export function ConfirmForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const supabase = createBrowserClient();

  useEffect(() => {
    // Supabase puts recovery tokens in URL hash. When client loads, the
    // @supabase/ssr browser client auto-exchanges the hash for a session.
    // We wait one tick then check for an active session.
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setReady(true);
      } else {
        setError(
          "Geçersiz veya süresi dolmuş sıfırlama linki. Yeni bir link iste."
        );
      }
    }, 200);
    return () => clearTimeout(t);
  }, [supabase]);

  async function onSubmit(formData: FormData) {
    const pwd = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;
    if (pwd !== confirm) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    if (pwd.length < 8) {
      setError("Şifre en az 8 karakter olmalı.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const { error: updErr } = await supabase.auth.updateUser({
        password: pwd,
      });
      if (updErr) {
        setError(updErr.message);
        return;
      }
      await supabase.auth.signOut();
      router.push("/login?reset=1");
    });
  }

  if (!ready && !error) {
    return (
      <div className="text-center text-sm text-neutral-400">Yükleniyor…</div>
    );
  }

  if (error && !ready) {
    return (
      <div className="rounded-md border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-300">
        {error}
      </div>
    );
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-wider text-neutral-500">
          Yeni Şifre
        </label>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          autoFocus
          className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-wider text-neutral-500">
          Şifreyi Tekrarla
        </label>
        <input
          type="password"
          name="confirm"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
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
        {pending ? "Güncelleniyor…" : "Şifreyi Güncelle"}
      </button>
    </form>
  );
}
