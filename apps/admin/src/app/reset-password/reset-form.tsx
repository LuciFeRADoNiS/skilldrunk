"use client";

import { useState, useTransition } from "react";
import { requestPasswordReset } from "@/app/actions/auth";

export function ResetForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onSubmit(formData: FormData) {
    const email = formData.get("email") as string;
    setError(null);
    startTransition(async () => {
      const res = await requestPasswordReset(email);
      if (res.ok) setSent(true);
      else setError(res.error ?? "Bir şeyler ters gitti.");
    });
  }

  if (sent) {
    return (
      <div className="rounded-md border border-emerald-800 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
        Sıfırlama linki email adresine gönderildi. Mail kutunu kontrol et.
      </div>
    );
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
        {pending ? "Gönderiliyor…" : "Sıfırlama Linki Gönder"}
      </button>
    </form>
  );
}
