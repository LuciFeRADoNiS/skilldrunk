"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shield, ShieldAlert, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateUserRole } from "@/app/actions/admin";
import { toast } from "sonner";

export function UserRoleActions({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function setRole(role: "user" | "moderator" | "admin") {
    startTransition(async () => {
      try {
        await updateUserRole(userId, role);
        toast.success(`Role updated to ${role}`);
        router.refresh();
      } catch {
        toast.error("Failed to update role");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {currentRole !== "user" && (
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => setRole("user")}
          title="Set as user"
        >
          <User className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      )}
      {currentRole !== "moderator" && (
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => setRole("moderator")}
          title="Set as moderator"
        >
          <Shield className="h-3.5 w-3.5 text-blue-600" />
        </Button>
      )}
      {currentRole !== "admin" && (
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => setRole("admin")}
          title="Set as admin"
        >
          <ShieldAlert className="h-3.5 w-3.5 text-orange-600" />
        </Button>
      )}
    </div>
  );
}
