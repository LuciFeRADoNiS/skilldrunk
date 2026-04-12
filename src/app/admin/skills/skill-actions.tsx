"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, CheckCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateSkillStatus } from "@/app/actions/admin";
import { toast } from "sonner";

export function AdminSkillActions({
  skillId,
  currentStatus,
}: {
  skillId: string;
  currentStatus: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function setStatus(status: "published" | "archived" | "draft") {
    startTransition(async () => {
      try {
        await updateSkillStatus(skillId, status);
        toast.success(`Skill ${status}`);
        router.refresh();
      } catch {
        toast.error("Failed to update skill");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {currentStatus !== "published" && (
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => setStatus("published")}
          title="Publish"
        >
          <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
        </Button>
      )}
      {currentStatus !== "archived" && (
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => setStatus("archived")}
          title="Archive"
        >
          <Archive className="h-3.5 w-3.5 text-amber-600" />
        </Button>
      )}
      {currentStatus !== "draft" && (
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => setStatus("draft")}
          title="Revert to draft"
        >
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}
