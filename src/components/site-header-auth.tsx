"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, Plus, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Profile = {
  username: string;
  avatar_url: string | null;
  role: string;
};

export function SiteHeaderAuth() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      if (!u) {
        setLoading(false);
        return;
      }
      setUser({ id: u.id, email: u.email });
      supabase
        .from("sd_profiles")
        .select("username, avatar_url, role")
        .eq("id", u.id)
        .maybeSingle()
        .then(({ data: profileData }) => {
          setProfile(profileData as Profile | null);
          setLoading(false);
        });
    });
  }, []);

  if (loading) {
    // Minimal placeholder to avoid layout shift
    return <div className="h-9 w-9" />;
  }

  return (
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
  );
}
