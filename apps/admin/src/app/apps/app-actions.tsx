"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleAppFeatured, toggleAppPublic, setAppStatus } from "@/app/actions/apps";

export function AppActions({
  appId,
  featured,
  isPublic,
  status,
}: {
  appId: string;
  featured: boolean;
  isPublic: boolean;
  status: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function runToggle(fn: (id: string) => Promise<unknown>) {
    start(async () => {
      await fn(appId);
      router.refresh();
    });
  }

  function runStatus(st: "live" | "draft" | "archived") {
    start(async () => {
      await setAppStatus(appId, st);
      router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 flex-col gap-1">
      <button
        disabled={pending}
        onClick={() => runToggle(toggleAppFeatured)}
        className={`rounded px-2 py-1 text-[10px] ${featured ? "bg-amber-500/20 text-amber-300" : "text-neutral-500 hover:bg-neutral-800"}`}
      >
        {featured ? "★ featured" : "☆ feature"}
      </button>
      <button
        disabled={pending}
        onClick={() => runToggle(toggleAppPublic)}
        className={`rounded px-2 py-1 text-[10px] ${isPublic ? "bg-emerald-500/20 text-emerald-300" : "text-neutral-500 hover:bg-neutral-800"}`}
      >
        {isPublic ? "◉ public" : "○ private"}
      </button>
      <div className="mt-1 flex gap-0.5">
        {(["live", "draft", "archived"] as const).map((st) => (
          <button
            key={st}
            disabled={pending || status === st}
            onClick={() => runStatus(st)}
            className={`rounded px-1.5 py-0.5 text-[9px] ${
              status === st
                ? "bg-neutral-700 text-neutral-200"
                : "text-neutral-500 hover:bg-neutral-800"
            }`}
          >
            {st}
          </button>
        ))}
      </div>
    </div>
  );
}
