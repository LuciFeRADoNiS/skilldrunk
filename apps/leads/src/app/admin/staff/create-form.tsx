"use client";

import { useActionState, useRef } from "react";
import { createStaff } from "./actions";

type State = { error?: string; success?: boolean } | undefined;

export function StaffCreateForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<State, FormData>(
    async (_prev, formData) => {
      const result = await createStaff(formData);
      if (result?.success) formRef.current?.reset();
      return result;
    },
    undefined,
  );

  return (
    <form ref={formRef} action={formAction} className="grid gap-3 sm:grid-cols-5">
      <input
        name="full_name"
        required
        placeholder="İsim Soyisim"
        className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm sm:col-span-2 focus:border-orange-500 focus:outline-none"
      />
      <input
        name="email"
        required
        type="email"
        placeholder="email@enco.com.tr"
        className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm sm:col-span-2 focus:border-orange-500 focus:outline-none"
      />
      <input
        name="team"
        placeholder="enco-sales"
        className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
      />
      <input
        name="phone"
        placeholder="+90 5xx... (opsiyonel)"
        className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm sm:col-span-3 focus:border-orange-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-orange-400 disabled:opacity-50 sm:col-span-2"
      >
        {pending ? "Ekleniyor..." : "Personel ekle"}
      </button>
      {state?.error && (
        <p className="sm:col-span-5 rounded-md border border-red-900 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="sm:col-span-5 rounded-md border border-emerald-900 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">
          Eklendi.
        </p>
      )}
    </form>
  );
}
