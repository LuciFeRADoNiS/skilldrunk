"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, SkipForward, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { submitArenaVote, type ArenaPair } from "@/app/actions/arena";
import { SKILL_TYPE_LABELS, type SkillType } from "@/lib/types";
import { toast } from "sonner";

const ORDERED_TYPES: SkillType[] = [
  "mcp_server",
  "claude_skill",
  "gpt",
  "cursor_rule",
  "prompt",
  "agent",
];

type Props = {
  pair: ArenaPair | null;
  selectedType: SkillType;
};

export function ArenaClient({ pair, selectedType }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pickedSide, setPickedSide] = useState<"a" | "b" | "skip" | null>(null);

  function cast(winnerId: string | null, side: "a" | "b" | "skip") {
    if (!pair || isPending) return;
    setPickedSide(side);
    startTransition(async () => {
      const res = await submitArenaVote(pair.matchId, winnerId);
      if (!res.ok) {
        toast.error(res.error);
        setPickedSide(null);
        return;
      }
      router.refresh();
      setTimeout(() => setPickedSide(null), 200);
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Arena
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Two skills enter. One leaves with a higher Elo. Pick the one you&apos;d
            actually use — the crowd builds the leaderboard.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/arena/leaderboard">
            <Trophy className="h-4 w-4" />
            Leaderboard
          </Link>
        </Button>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {ORDERED_TYPES.map((t) => {
          const isActive = t === selectedType;
          return (
            <Button
              key={t}
              asChild
              size="sm"
              variant={isActive ? "default" : "outline"}
              className="font-mono text-xs"
            >
              <Link href={`/arena?type=${t}`}>{SKILL_TYPE_LABELS[t]}</Link>
            </Button>
          );
        })}
      </div>

      {pair ? (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <SkillCard
              side="a"
              skill={pair.a}
              picked={pickedSide}
              disabled={isPending}
              onPick={() => cast(pair.a.id, "a")}
            />
            <SkillCard
              side="b"
              skill={pair.b}
              picked={pickedSide}
              disabled={isPending}
              onPick={() => cast(pair.b.id, "b")}
            />
          </div>
          <div className="mt-6 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => cast(null, "skip")}
            >
              <SkipForward className="h-4 w-4" />
              Skip this matchup
            </Button>
          </div>
        </>
      ) : (
        <Card className="py-12 text-center">
          <CardHeader>
            <CardTitle>No matchups left</CardTitle>
            <CardDescription>
              We&apos;re out of fresh pairs for {SKILL_TYPE_LABELS[selectedType]}s. Try
              another type above, or come back after more skills are published.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}

function SkillCard({
  side,
  skill,
  picked,
  disabled,
  onPick,
}: {
  side: "a" | "b";
  skill: ArenaPair["a"];
  picked: "a" | "b" | "skip" | null;
  disabled: boolean;
  onPick: () => void;
}) {
  const isWinner = picked === side;
  const isLoser = picked && picked !== side && picked !== "skip";
  return (
    <Card
      className={`flex h-full flex-col justify-between transition ${
        isWinner ? "border-emerald-400 shadow-lg" : ""
      } ${isLoser ? "opacity-50" : ""}`}
    >
      <CardHeader>
        <div className="mb-2 flex items-center justify-between">
          <Badge variant="outline" className="font-mono text-[10px]">
            Elo {skill.rating}
          </Badge>
          <span className="font-mono text-[10px] text-muted-foreground">
            {skill.wins}W · {skill.losses}L
          </span>
        </div>
        <CardTitle className="text-lg">
          <Link
            href={`/s/${skill.slug}`}
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            {skill.title}
          </Link>
        </CardTitle>
        <CardDescription className="line-clamp-4">
          {skill.summary}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {skill.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {skill.tags.slice(0, 5).map((tag) => (
              <Badge key={tag} variant="secondary" className="font-mono text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        <Button
          size="lg"
          className="mt-auto"
          disabled={disabled}
          onClick={onPick}
        >
          Pick this one
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
