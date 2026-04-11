"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinWaitlist } from "@/app/actions/waitlist";

export function WaitlistForm() {
  const [pending, startTransition] = useTransition();
  const [joined, setJoined] = useState(false);

  async function action(formData: FormData) {
    startTransition(async () => {
      const result = await joinWaitlist(formData);
      if (result.ok) {
        setJoined(true);
        toast.success(
          result.alreadyJoined
            ? "You're already on the list. Cheers."
            : "You're in. We'll be in touch."
        );
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  }

  if (joined) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
        <p className="font-medium">You&apos;re on the list.</p>
        <p className="text-sm opacity-80">
          We&apos;ll ping you the moment skilldrunk opens up.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row">
      <Input
        type="email"
        name="email"
        required
        placeholder="you@builder.dev"
        className="h-12 text-base"
        disabled={pending}
      />
      <Button
        type="submit"
        disabled={pending}
        size="lg"
        className="h-12 px-6 text-base font-semibold"
      >
        {pending ? "Joining..." : "Join the waitlist"}
      </Button>
    </form>
  );
}
