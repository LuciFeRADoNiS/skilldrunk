"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Comment } from "@/lib/types";

type Props = {
  skillId: string;
  initialComments: Comment[];
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CommentSection({ skillId, initialComments }: Props) {
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!body.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/comment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ skillId, body: body.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          toast.error("Sign in to comment.");
        } else {
          toast.error(data.error ?? "Could not post comment.");
        }
        return;
      }
      const { comment } = await res.json();
      setComments((prev) => [...prev, comment]);
      setBody("");
      toast.success("Comment posted.");
    });
  }

  return (
    <section>
      <h2 className="text-xl font-semibold">
        Comments <span className="text-muted-foreground">({comments.length})</span>
      </h2>

      <div className="mt-5">
        <Textarea
          placeholder="Share your experience with this skill..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          disabled={isPending}
        />
        <div className="mt-2 flex justify-end">
          <Button onClick={submit} disabled={isPending || !body.trim()}>
            {isPending ? "Posting..." : "Post comment"}
          </Button>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No comments yet. Be the first.
          </p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={c.author?.avatar_url ?? undefined} />
              <AvatarFallback>
                {c.author?.username?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-baseline gap-2 text-sm">
                <span className="font-semibold">
                  @{c.author?.username ?? "anon"}
                </span>
                <span className="text-muted-foreground">
                  {formatDate(c.created_at)}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                {c.body_md}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
