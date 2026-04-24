"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUserRole } from "@/app/actions/manage";

export function UserActions({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function setRole(role: "user" | "moderator" | "admin") {
    start(async () => {
      await updateUserRole(userId, role);
      router.refresh();
    });
  }

  return (
    <div className="flex justify-end gap-1">
      {currentRole !== "user" && (
        <button
          disabled={pending}
          onClick={() => setRole("user")}
          className="rounded px-2 py-1 text-[10px] text-neutral-400 hover:bg-neutral-800"
        >
          USER
        </button>
      )}
      {currentRole !== "moderator" && (
        <button
          disabled={pending}
          onClick={() => setRole("moderator")}
          className="rounded px-2 py-1 text-[10px] text-blue-400 hover:bg-blue-500/10"
        >
          MOD
        </button>
      )}
      {currentRole !== "admin" && (
        <button
          disabled={pending}
          onClick={() => setRole("admin")}
          className="rounded px-2 py-1 text-[10px] text-orange-400 hover:bg-orange-500/10"
        >
          ADMIN
        </button>
      )}
    </div>
  );
}
