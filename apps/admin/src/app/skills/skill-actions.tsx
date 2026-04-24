"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSkillStatus } from "@/app/actions/manage";

export function SkillActions({
  skillId,
  currentStatus,
}: {
  skillId: string;
  currentStatus: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function setStatus(status: "published" | "archived" | "draft") {
    start(async () => {
      await updateSkillStatus(skillId, status);
      router.refresh();
    });
  }

  return (
    <div className="flex justify-end gap-1">
      {currentStatus !== "published" && (
        <button
          disabled={pending}
          onClick={() => setStatus("published")}
          className="rounded px-2 py-1 text-[10px] text-emerald-400 hover:bg-emerald-500/10"
        >
          PUBLISH
        </button>
      )}
      {currentStatus !== "archived" && (
        <button
          disabled={pending}
          onClick={() => setStatus("archived")}
          className="rounded px-2 py-1 text-[10px] text-amber-400 hover:bg-amber-500/10"
        >
          ARCHIVE
        </button>
      )}
      {currentStatus !== "draft" && (
        <button
          disabled={pending}
          onClick={() => setStatus("draft")}
          className="rounded px-2 py-1 text-[10px] text-neutral-400 hover:bg-neutral-800"
        >
          DRAFT
        </button>
      )}
    </div>
  );
}
