"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateReportStatus } from "@/app/actions/admin";
import { toast } from "sonner";

export function ReportActions({
  reportId,
  currentStatus,
}: {
  reportId: string;
  currentStatus: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function setStatus(status: "reviewed" | "actioned" | "dismissed") {
    startTransition(async () => {
      try {
        await updateReportStatus(reportId, status);
        toast.success(`Report ${status}`);
        router.refresh();
      } catch {
        toast.error("Failed to update report");
      }
    });
  }

  if (currentStatus !== "open") return null;

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        size="sm"
        variant="ghost"
        disabled={isPending}
        onClick={() => setStatus("reviewed")}
        title="Mark reviewed"
      >
        <Eye className="h-3.5 w-3.5 text-blue-600" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={isPending}
        onClick={() => setStatus("actioned")}
        title="Action taken"
      >
        <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={isPending}
        onClick={() => setStatus("dismissed")}
        title="Dismiss"
      >
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    </div>
  );
}
