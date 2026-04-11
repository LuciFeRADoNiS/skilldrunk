"use client";

import { useOptimistic, useTransition } from "react";
import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  skillId: string;
  initialScore: number;
  initialVote: -1 | 0 | 1;
};

export function VoteButtons({ skillId, initialScore, initialVote }: Props) {
  const [isPending, startTransition] = useTransition();
  const [state, setOptimistic] = useOptimistic<
    { score: number; vote: -1 | 0 | 1 },
    -1 | 1
  >(
    { score: initialScore, vote: initialVote },
    (current, nextValue) => {
      // If user clicks the same arrow twice, unvote.
      if (current.vote === nextValue) {
        return {
          score: current.score - nextValue,
          vote: 0,
        };
      }
      // Switching directions: swing by 2. Fresh vote: swing by 1.
      const delta = current.vote === 0 ? nextValue : 2 * nextValue;
      return { score: current.score + delta, vote: nextValue };
    }
  );

  async function cast(value: -1 | 1) {
    startTransition(async () => {
      setOptimistic(value);
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ skillId, value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          toast.error("Sign in to vote.");
        } else {
          toast.error(data.error ?? "Vote failed.");
        }
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border bg-background p-2">
      <button
        onClick={() => cast(1)}
        disabled={isPending}
        aria-label="Upvote"
        className={cn(
          "rounded-md p-1.5 transition hover:bg-muted",
          state.vote === 1 && "text-orange-500"
        )}
      >
        <ArrowBigUp className="h-6 w-6" fill={state.vote === 1 ? "currentColor" : "none"} />
      </button>
      <span className="min-w-6 text-center text-sm font-semibold tabular-nums">
        {state.score}
      </span>
      <button
        onClick={() => cast(-1)}
        disabled={isPending}
        aria-label="Downvote"
        className={cn(
          "rounded-md p-1.5 transition hover:bg-muted",
          state.vote === -1 && "text-blue-500"
        )}
      >
        <ArrowBigDown className="h-6 w-6" fill={state.vote === -1 ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
