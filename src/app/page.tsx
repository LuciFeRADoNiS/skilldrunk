import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { WaitlistForm } from "@/components/waitlist-form";
import { SiteHeader } from "@/components/site-header";
import { SKILL_TYPE_LABELS, type SkillType } from "@/lib/types";

const skillTypes: SkillType[] = [
  "claude_skill",
  "mcp_server",
  "gpt",
  "cursor_rule",
  "prompt",
  "agent",
];

const features = [
  {
    title: "Every format, one library",
    body: "Claude Skills, Custom GPTs, MCP servers, Cursor rules, prompts, agents — stop hunting across ten directories.",
  },
  {
    title: "Upvote the good, bury the bad",
    body: "Reddit-style voting and threaded reviews so the best skills rise and the hype dies.",
  },
  {
    title: "Arena, not just a list",
    body: "Pit two skills head-to-head on a real task. Leaderboards come from crowd votes, not marketing.",
  },
  {
    title: "Claim and ship yours",
    body: "Publish a skill with one click from GitHub. Version it, track usage, earn reputation.",
  },
];

export default function HomePage() {
  return (
    <main className="flex-1">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 10%, rgba(249,115,22,0.15), transparent 40%), radial-gradient(circle at 80% 20%, rgba(59,130,246,0.12), transparent 40%)",
          }}
        />
        <div className="mx-auto max-w-4xl px-6 py-24 text-center sm:py-32">
          <Badge variant="outline" className="mb-6 font-mono text-xs">
            Coming soon · Invite only
          </Badge>
          <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            The library for{" "}
            <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 bg-clip-text text-transparent">
              AI skills
            </span>
            .
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl">
            Discover, discuss, and rank the skills that make AI agents useful.
            Claude Skills, MCP servers, Custom GPTs, Cursor rules, and prompts
            — upvoted by the people who actually ship with them.
          </p>

          <div className="mx-auto mt-10 max-w-xl">
            <WaitlistForm />
            <p className="mt-3 text-xs text-muted-foreground">
              No spam. We&apos;ll send one email when the library opens.
            </p>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-2">
            {skillTypes.map((t) => (
              <Badge key={t} variant="secondary" className="font-mono text-xs">
                {SKILL_TYPE_LABELS[t]}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="library" className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              A Reddit for the skill economy.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Static directories list skills. skilldrunk ranks them, argues
              about them, and keeps receipts.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border bg-background p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <p className="font-mono">© {new Date().getFullYear()} skilldrunk</p>
          <p>
            Built for builders.{" "}
            <Link
              href="https://github.com/anthropics/skills"
              target="_blank"
              className="underline hover:text-foreground"
            >
              Skills spec
            </Link>
          </p>
        </div>
      </footer>
    </main>
  );
}
