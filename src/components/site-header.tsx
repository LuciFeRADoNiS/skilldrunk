import Link from "next/link";
import { LogOut, Plus, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: {
    username: string;
    avatar_url: string | null;
    role: string;
  } | null = null;
  if (user) {
    const { data } = await supabase
      .from("sd_profiles")
      .select("username, avatar_url, role")
      .eq("id", user.id)
      .maybeSingle();
    profile = data;
  }

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

        <div className="flex items-center gap-3">
          {user && (
            <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
              <Link href="/new">
                <Plus className="h-4 w-4" />
                Submit skill
              </Link>
            </Button>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full outline-hidden ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback>
                      {(profile?.username ?? user.email ?? "?")[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {profile?.username && (
                  <DropdownMenuItem asChild>
                    <Link href={`/u/${profile.username}`}>My profile</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/new">Submit skill</Link>
                </DropdownMenuItem>
                {profile?.role === "admin" && (
                  <DropdownMenuItem asChild>
                    <a
                      href="https://admin.skilldrunk.com"
                      className="gap-2"
                    >
                      <Shield className="h-4 w-4 text-orange-500" />
                      Admin Panel ↗
                    </a>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <form action="/auth/signout" method="post">
                  <DropdownMenuItem asChild>
                    <button type="submit" className="w-full gap-2">
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
