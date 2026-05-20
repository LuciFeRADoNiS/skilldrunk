"use client";

import { useTransition } from "react";
import { toggleStaffActive } from "./actions";

export function ToggleActiveButton({
  staffId,
  active,
}: {
  staffId: number;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => toggleStaffActive(staffId, !active).then(() => {}))}
      className="text-xs text-neutral-400 hover:text-neutral-100 disabled:opacity-50"
    >
      {pending ? "..." : active ? "Devre dışı bırak" : "Aktif et"}
    </button>
  );
}
