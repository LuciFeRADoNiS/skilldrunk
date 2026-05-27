"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronUp,
  ExternalLink,
  Info,
  SkipForward,
  Swords,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { submitArenaVote, type ArenaPair, type ArenaSkill } from "@/app/actions/arena";
import { SKILL_TYPE_LABELS, SKILL_TYPE_COLORS, type SkillType } from "@/lib/types";
import { toast } from "sonner";

/* ──────────────────── constants ──────────────────── */

const ORDERED_TYPES: SkillType[] = [
  "mcp_server",
  "claude_skill",
  "gpt",
  "cursor_rule",
  "prompt",
  "agent",
];

const RESULT_SHOW_MS = 1800;
const ONBOARDING_KEY = "sd-arena-onboarding-seen";

/* ──────────────────── types ──────────────────── */

type Phase = "pick" | "result" | "loading";

type VoteResult = {
  winnerId: string;
  side: "a" | "b";
  newRatingA: number;
  newRatingB: number;
  deltaA: number;
  deltaB: number;
};

type Props = {
  pair: ArenaPair | null;
  selectedType: SkillType;
};

/* ──────────────────── main component ──────────────────── */

export function ArenaClient({ pair, selectedType }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [phase, setPhase] = useState<Phase>("pick");
  const [voteResult, setVoteResult] = useState<VoteResult | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Onboarding: show once per browser
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(ONBOARDING_KEY)) {
      setShowOnboarding(true);
    }
  }, []);

  function dismissOnboarding() {
    setShowOnboarding(false);
    localStorage.setItem(ONBOARDING_KEY, "1");
  }

  // Reset phase on new pair from server
  useEffect(() => {
    setPhase("pick");
    setVoteResult(null);
  }, [pair?.matchId]);

  const cast = useCallback(
    (winnerId: string | null, side: "a" | "b" | "skip") => {
      if (!pair || isPending || phase !== "pick") return;

      setPhase("result");

      startTransition(async () => {
        const res = await submitArenaVote(pair.matchId, winnerId);

        if (!res.ok) {
          toast.error(res.error);
          setPhase("pick");
          return;
        }

        if (res.skipped) {
          toast("Skipped", {
            description: "Loading next matchup…",
            icon: <SkipForward className="h-4 w-4" />,
          });
          setMatchCount((c) => c + 1);
          setPhase("loading");
          router.refresh();
          return;
        }

        // Compute deltas from pre-vote ratings
        const newA = res.newRatingA ?? pair.a.rating;
        const newB = res.newRatingB ?? pair.b.rating;
        const deltaA = newA - pair.a.rating;
        const deltaB = newB - pair.b.rating;
        const winSide = side as "a" | "b";
        const winner = winSide === "a" ? pair.a : pair.b;

        setVoteResult({
          winnerId: winnerId!,
          side: winSide,
          newRatingA: newA,
          newRatingB: newB,
          deltaA,
          deltaB,
        });

        setMatchCount((c) => c + 1);

        toast.success(`${winner.title} wins!`, {
          description: `${deltaA >= 0 ? "+" : ""}${deltaA} → ${newA} Elo`,
          icon: <Zap className="h-4 w-4" />,
        });

        // Show result, then advance
        setTimeout(() => {
          setPhase("loading");
          router.refresh();
        }, RESULT_SHOW_MS);
      });
    },
    [pair, isPending, phase, router, startTransition]
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* ── Onboarding banner ── */}
      {showOnboarding && (
        <div className="relative mb-8 rounded-xl border border-orange-200 bg-orange-50 p-5 dark:border-orange-900 dark:bg-orange-950/30">
          <button
            onClick={dismissOnboarding}
            className="absolute right-3 top-3 rounded-md p-1 text-orange-400 hover:bg-orange-100 hover:text-orange-600 dark:hover:bg-orange-900"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
            <div>
              <h3 className="font-semibold text-orange-900 dark:text-orange-200">
                Welcome to the Arena!
              </h3>
              <p className="mt-1 text-sm text-orange-800 dark:text-orange-300">
                Two skills go head-to-head. Pick the one you&apos;d actually
                use — your vote updates their Elo rating. The community builds
                the leaderboard together. You can skip matchups you&apos;re
                unsure about.
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-orange-700 dark:text-orange-400">
                <span className="flex items-center gap-1">
                  <Swords className="h-3.5 w-3.5" /> Click a card to pick it
                </span>
                <span className="flex items-center gap-1">
                  <SkipForward className="h-3.5 w-3.5" /> Skip if unsure
                </span>
                <span className="flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5" /> See results on the leaderboard
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900"
                onClick={dismissOnboarding}
              >
                Got it, let&apos;s go!
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight sm:text-4xl">
            <Swords className="h-8 w-8 text-orange-500" />
            Arena
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Two skills enter. One leaves with a higher Elo. Pick the one
            you&apos;d actually use.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {matchCount > 0 && (
            <Badge variant="secondary" className="font-mono text-xs">
              {matchCount} vote{matchCount !== 1 ? "s" : ""} this session
            </Badge>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href={`/arena/leaderboard?type=${selectedType}`}>
              <Trophy className="h-4 w-4" />
              Leaderboard
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Type filter ── */}
      <div className="mb-8 flex flex-wrap gap-2">
        {ORDERED_TYPES.map((t) => {
          const isActive = t === selectedType;
          const colors = SKILL_TYPE_COLORS[t];
          return (
            <Button
              key={t}
              asChild
              size="sm"
              variant={isActive ? "default" : "outline"}
              className={`font-mono text-xs ${
                isActive ? "" : "hover:bg-muted"
              }`}
            >
              <Link href={`/arena?type=${t}`}>{SKILL_TYPE_LABELS[t]}</Link>
            </Button>
          );
        })}
      </div>

      {/* ── Matchup ── */}
      {pair ? (
        <>
          <div className="relative grid gap-4 md:grid-cols-[1fr,auto,1fr] md:gap-0">
            {/* Skill A */}
            <SkillCard
              side="a"
              skill={pair.a}
              phase={phase}
              voteResult={voteResult}
              disabled={isPending || phase !== "pick"}
              onPick={() => cast(pair.a.id, "a")}
            />

            {/* VS divider */}
            <div className="flex items-center justify-center md:px-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-orange-200 bg-orange-50 font-mono text-sm font-bold text-orange-600 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-400">
                VS
              </div>
            </div>

            {/* Skill B */}
            <SkillCard
              side="b"
              skill={pair.b}
              phase={phase}
              voteResult={voteResult}
              disabled={isPending || phase !== "pick"}
              onPick={() => cast(pair.b.id, "b")}
            />
          </div>

          {/* Skip */}
          <div className="mt-6 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              disabled={isPending || phase !== "pick"}
              className="text-muted-foreground hover:text-foreground"
              onClick={() => cast(null, "skip")}
            >
              <SkipForward className="h-4 w-4" />
              Skip — I can&apos;t decide
            </Button>
          </div>

          {/* Phase indicator */}
          {phase === "loading" && (
            <div className="mt-4 flex justify-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                Loading next matchup…
              </div>
            </div>
          )}
        </>
      ) : (
        <Card className="py-12 text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              All caught up!
            </CardTitle>
            <CardDescription className="mx-auto max-w-md">
              You&apos;ve seen every {SKILL_TYPE_LABELS[selectedType]} matchup
              we have. Try another type above, or come back after more skills
              are published.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={`/arena/leaderboard?type=${selectedType}`}>
                <Trophy className="h-4 w-4" />
                See leaderboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ──────────────────── skill card ──────────────────── */

function SkillCard({
  side,
  skill,
  phase,
  voteResult,
  disabled,
  onPick,
}: {
  side: "a" | "b";
  skill: ArenaSkill;
  phase: Phase;
  voteResult: VoteResult | null;
  disabled: boolean;
  onPick: () => void;
}) {
  const isWinner = voteResult?.side === side;
  const isLoser = voteResult && voteResult.side !== side;
  const showResult = phase === "result" && voteResult;
  const delta = side === "a" ? voteResult?.deltaA : voteResult?.deltaB;
  const newRating = side === "a" ? voteResult?.newRatingA : voteResult?.newRatingB;

  return (
    <Card
      className={`group relative flex h-full flex-col justify-between transition-all duration-300 ${
        phase === "pick"
          ? "cursor-pointer hover:border-orange-300 hover:shadow-md dark:hover:border-orange-700"
          : ""
      } ${
        isWinner
          ? "border-emerald-400 bg-emerald-50/50 shadow-lg shadow-emerald-100 dark:border-emerald-600 dark:bg-emerald-950/20 dark:shadow-emerald-900/20"
          : ""
      } ${isLoser ? "opacity-50 grayscale-[30%]" : ""}`}
      onClick={phase === "pick" && !disabled ? onPick : undefined}
    >
      {/* Winner/Loser badge overlay */}
      {showResult && isWinner && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Badge className="bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-md">
            <ChevronUp className="mr-1 h-3 w-3" />
            Winner
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3">
        {/* Rating + W/L row */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="font-mono text-xs tabular-nums"
            >
              {showResult && newRating != null ? newRating : skill.rating} Elo
            </Badge>
            {showResult && delta != null && delta !== 0 && (
              <span
                className={`animate-in fade-in slide-in-from-left-2 font-mono text-xs font-semibold ${
                  delta > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                }`}
              >
                {delta > 0 ? "+" : ""}
                {delta}
              </span>
            )}
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">
            {skill.wins}W · {skill.losses}L
          </span>
        </div>

        {/* Title */}
        <CardTitle className="text-lg leading-tight">
          {skill.title}
        </CardTitle>
        <CardDescription className="mt-1.5 line-clamp-3 text-sm">
          {skill.summary}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {/* Tags */}
        {skill.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {skill.tags.slice(0, 4).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="font-mono text-[10px]"
              >
                {tag}
              </Badge>
            ))}
            {skill.tags.length > 4 && (
              <Badge variant="secondary" className="font-mono text-[10px]">
                +{skill.tags.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Action row */}
        <div className="mt-auto flex items-center gap-2">
          {phase === "pick" ? (
            <Button
              size="lg"
              className="flex-1 bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-500"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                onPick();
              }}
            >
              Pick this one
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : showResult && isWinner ? (
            <div className="flex flex-1 items-center justify-center gap-1 rounded-md bg-emerald-100 py-2.5 text-sm font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <Zap className="h-4 w-4" /> Selected
            </div>
          ) : (
            <div className="flex-1 rounded-md bg-muted py-2.5 text-center text-sm text-muted-foreground">
              —
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            asChild
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <Link
              href={`/s/${skill.slug}`}
              target="_blank"
              rel="noreferrer"
              title="View details"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
