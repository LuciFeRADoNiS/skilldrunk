"use client";

import { useFormStatus } from "react-dom";

export function MarkAllButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;
  return (
    <button
      type="submit"
      disabled={isDisabled}
      className="rounded-md border border-neutral-800 px-3 py-1.5 text-xs text-neutral-300 transition hover:bg-neutral-900 disabled:opacity-40"
    >
      {pending ? "işleniyor…" : "Mark all read"}
    </button>
  );
}
