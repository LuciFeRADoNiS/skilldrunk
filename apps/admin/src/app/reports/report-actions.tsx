"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateReportStatus } from "@/app/actions/manage";

export function ReportActions({
  reportId,
  currentStatus,
}: {
  reportId: string;
  currentStatus: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  if (currentStatus !== "open") return null;

  function set(status: "reviewed" | "actioned" | "dismissed") {
    start(async () => {
      await updateReportStatus(reportId, status);
      router.refresh();
    });
  }

  return (
    <div className="flex justify-end gap-1">
      <button
        disabled={pending}
        onClick={() => set("reviewed")}
        className="rounded px-2 py-1 text-[10px] text-blue-400 hover:bg-blue-500/10"
      >
        REVIEW
      </button>
      <button
        disabled={pending}
        onClick={() => set("actioned")}
        className="rounded px-2 py-1 text-[10px] text-emerald-400 hover:bg-emerald-500/10"
      >
        ACTION
      </button>
      <button
        disabled={pending}
        onClick={() => set("dismissed")}
        className="rounded px-2 py-1 text-[10px] text-neutral-500 hover:bg-neutral-800"
      >
        DISMISS
      </button>
    </div>
  );
}
