"use client";

import { useState, useTransition } from "react";
import { approveTask, rejectTask } from "./actions";

export function ApproveRejectActions({
  taskId,
  status,
}: {
  taskId: number;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canActOn = status === "email_sent" || status === "submitted";
  const isApproved = status === "approved";
  const isRejected = status === "rejected";

  if (isApproved) {
    return (
      <div className="rounded-lg border border-emerald-900 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-300">
        ✓ Bu görev onaylandı.
      </div>
    );
  }

  if (isRejected) {
    return (
      <div className="rounded-lg border border-red-900 bg-red-950/20 px-4 py-3 text-sm text-red-300">
        ✗ Bu görev reddedildi — satışçı yeniden gönderebilir.
      </div>
    );
  }

  if (!canActOn) {
    return (
      <div className="rounded-lg border border-neutral-900 bg-neutral-950 px-4 py-3 text-xs text-neutral-500">
        Şu an aksiyon alınamaz (status: <span className="font-mono">{status}</span>).
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-orange-900 bg-orange-950/20 p-4 space-y-3">
      <p className="text-sm font-medium text-orange-300">
        Bu görev onayını bekliyor — CC inbox&apos;ında mail&apos;i doğruladıktan sonra:
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const r = await approveTask(taskId);
              if (r?.error) setError(r.error);
            });
          }}
          className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          ✓ Onayla
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setShowReject((s) => !s)}
          className="rounded-md border border-red-800 px-4 py-2 text-sm text-red-300 hover:bg-red-950/40"
        >
          ✗ Reddet
        </button>
      </div>

      {showReject && (
        <form
          action={async (formData) => {
            setError(null);
            const r = await rejectTask(taskId, formData);
            if (r?.error) setError(r.error);
            else setShowReject(false);
          }}
          className="space-y-2"
        >
          <textarea
            name="reason"
            required
            rows={3}
            placeholder="Red sebebi (satışçıya iletilecek)..."
            className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-red-400 disabled:opacity-50"
          >
            Reddi gönder
          </button>
        </form>
      )}

      {error && (
        <p className="rounded-md border border-red-900 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
