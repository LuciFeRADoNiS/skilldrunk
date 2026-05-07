"use client";
import { useState, useTransition } from "react";
import { createBrowserClient } from "@skilldrunk/supabase/client";

export function PasswordForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setOk(false);
    const pwd = (formData.get("password") as string) ?? "";
    const confirm = (formData.get("confirm") as string) ?? "";

    if (pwd.length < 8) {
      setError("Şifre en az 8 karakter olmalı.");
      return;
    }
    if (pwd !== confirm) {
      setError("Şifreler eşleşmiyor.");
      return;
    }

    startTransition(async () => {
      const supabase = createBrowserClient();
      const { error: updErr } = await supabase.auth.updateUser({
        password: pwd,
      });
      if (updErr) {
        setError(updErr.message);
        return;
      }
      setOk(true);
      // Reset form
      const form = document.getElementById("pw-form") as HTMLFormElement | null;
      form?.reset();
    });
  }

  return (
    <form id="pw-form" action={onSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
          Yeni Şifre
        </label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-sm focus:outline-none focus:border-orange-500"
        />
      </div>
      <div>
        <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
          Tekrar
        </label>
        <input
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-sm focus:outline-none focus:border-orange-500"
        />
      </div>

      {error && (
        <div className="px-3 py-2 bg-rose-950/30 border border-rose-900/50 rounded text-sm text-rose-300">
          {error}
        </div>
      )}
      {ok && (
        <div className="px-3 py-2 bg-emerald-950/30 border border-emerald-900/50 rounded text-sm text-emerald-300">
          Şifre güncellendi.
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded text-sm font-medium transition"
      >
        {pending ? "Kaydediliyor..." : "Şifreyi Güncelle"}
      </button>
    </form>
  );
}
