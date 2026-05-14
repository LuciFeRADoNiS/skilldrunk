import Link from "next/link";
import { SiteHeaderAuth } from "./site-header-auth";

export function SiteHeader() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2 font-mono text-lg font-bold"
          >
            <span className="inline-block h-3 w-3 rounded-full bg-orange-500" />
            skilldrunk
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            <Link href="/feed" className="hover:text-foreground">
              Trending
            </Link>
            <Link href="/arena" className="hover:text-foreground">
              Arena
            </Link>
            <Link href="/arena/leaderboard" className="hover:text-foreground">
              Leaderboard
            </Link>
            <Link href="/search" className="hover:text-foreground">
              Search
            </Link>
            <Link
              href="/find"
              className="flex items-center gap-1 hover:text-foreground"
            >
              <span>Find</span>
              <span className="rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[9px] font-mono text-orange-500">
                ✦ AI
              </span>
            </Link>
            <Link href="/about" className="hover:text-foreground">
              About
            </Link>
            <Link href="/docs" className="hover:text-foreground">
              Docs
            </Link>
          </nav>
        </div>

        <SiteHeaderAuth />
      </div>
    </header>
  );
}
