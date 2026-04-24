"use client";

import { useState, useTransition } from "react";
import { signInWithPassword } from "@/app/actions/auth";

export function LoginForm({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onSubmit(formData: FormData) {
    setError(null);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    startTransition(async () => {
      const res = await signInWithPassword(email, password, next);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Full reload so the just-set auth cookies are sent with the next request.
      window.location.assign(res.next);
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
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
