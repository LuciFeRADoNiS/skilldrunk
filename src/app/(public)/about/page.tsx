import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageSquare, Sparkles, Swords, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "About skilldrunk",
  description:
    "Why skilldrunk exists — the community-ranked library for AI skills: Claude Skills, MCP servers, Custom GPTs, Cursor rules, prompts, and agents.",
};

export default function AboutPage() {
  return (
    <main className="flex-1">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-6 py-16">
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          about
        </p>
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          The library for AI skills.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          skilldrunk is a community-ranked catalog for every piece of AI glue —
          Claude Skills, MCP servers, Custom GPTs, Cursor rules, prompts, and
          agents. Discover the best, pit two skills head-to-head, and ship.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/feed">
              <ArrowRight className="h-4 w-4" /> Browse skills
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/arena">
              <Swords className="h-4 w-4" /> Enter the arena
            </Link>
          </Button>
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-2xl font-bold tracking-tight">Why a library?</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            AI skills are fragmented — github repos, gist dumps, Cursor forum
            posts, Reddit threads, vendor directories. None of them rank. None
            of them let the people who actually ship decide what&apos;s good.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <Card icon={Sparkles} title="Every format, one catalog">
              Claude Skills, GPTs, MCP servers, Cursor rules, prompts, agents —
              one type filter per skill, one vote system, one search box.
            </Card>
            <Card icon={MessageSquare} title="Reddit-style discussion">
              Upvotes bury hype; threaded comments preserve receipts. Creators
              can reply, defend, ship updates.
            </Card>
            <Card icon={Swords} title="Arena, not a list">
              Two skills enter. Pick the one you&apos;d actually use. K=32 Elo
              builds the leaderboard from crowd votes, not marketing.
            </Card>
            <Card icon={Zap} title="AI-native APIs">
              REST at <code>/api/v1</code>, MCP at{" "}
              <code>/api/mcp</code>. Your AI client can search and vote
              natively. <Link href="/docs/api" className="underline">docs</Link>.
            </Card>
          </div>
        </div>
      </section>

      <section className="border-t">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-2xl font-bold tracking-tight">
            Built for AI agents, by someone who ships with them
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            The MCP server (<code>npx -y @skilldrunk/mcp</code>) plugs into Claude
            Desktop, Cursor, Windsurf, or any MCP-compatible client. Ask your
            agent: <em>&quot;find a Claude Skill for parsing PDFs&quot;</em> and it
            will search, read, and (with an API key) vote and comment — all
            through skilldrunk.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/docs/mcp">
                <Sparkles className="h-4 w-4" /> MCP setup
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/docs/api">
                <ArrowRight className="h-4 w-4" /> REST API
              </Link>
            </Button>
            <Button asChild variant="outline">
              <a
                href="https://github.com/LuciFeRADoNiS/skilldrunk"
                target="_blank"
                rel="noreferrer"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.38 7.86 10.9.58.1.79-.25.79-.56 0-.28-.01-1.01-.02-1.99-3.2.7-3.87-1.54-3.87-1.54-.52-1.32-1.28-1.67-1.28-1.67-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.95.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.39-5.25 5.67.41.35.78 1.05.78 2.11 0 1.52-.01 2.75-.01 3.12 0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
                </svg>
                GitHub
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-2xl font-bold tracking-tight">FAQ</h2>
          <dl className="mt-6 space-y-6 text-sm">
            <Faq q="Is it free?">
              Yes. Reading, voting, commenting, and publishing are all free.
              Heavy API users can add a Bearer key for higher rate limits.
            </Faq>
            <Faq q="How do you sign in?">
              Google OAuth on <code>skilldrunk.com</code>. New accounts get a
              profile you can claim and decorate at{" "}
              <code>/u/your-username</code>.
            </Faq>
            <Faq q="How does the arena rank skills?">
              Every vote is a K=32 Elo match. Skills with fewer matches are
              paired more often so new entries get exposure. See{" "}
              <Link href="/arena/leaderboard" className="underline">
                leaderboard
              </Link>
              .
            </Faq>
            <Faq q="Can I submit my skill?">
              Absolutely. <Link href="/new" className="underline">Publish</Link>{" "}
              in &lt;2 minutes — paste a GitHub URL or paste the markdown. We&apos;ll
              generate a slug, index it, and notify subscribers.
            </Faq>
            <Faq q="Is there a Smithery / LangChain / LlamaIndex listing?">
              MCP server available on npm as{" "}
              <code>@skilldrunk/mcp</code>. Smithery listing in progress. REST
              API is a few lines of <code>fetch()</code>.
            </Faq>
          </dl>
        </div>
      </section>

      <section className="border-t">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            Ready to ship with better skills?
          </h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/feed">
                <Trophy className="h-4 w-4" /> Browse trending
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/new">
                <ArrowRight className="h-4 w-4" /> Publish a skill
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-background p-6">
      <Icon className="h-6 w-6 text-orange-500" />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-semibold">{q}</dt>
      <dd className="mt-1 text-muted-foreground">{children}</dd>
    </div>
  );
}
