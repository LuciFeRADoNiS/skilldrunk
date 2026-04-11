import Link from "next/link";
import type { Metadata } from "next";
import { SignInButtons } from "@/components/sign-in-buttons";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to skilldrunk to vote, comment, and publish skills.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="flex items-center gap-2 font-mono text-lg font-bold"
          >
            <span className="inline-block h-3 w-3 rounded-full bg-orange-500" />
            skilldrunk
          </Link>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Vote on skills, join the discussion, and publish your own.
          </p>

          {error && (
            <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              Sign in failed. Please try again.
            </div>
          )}

          <div className="mt-8">
            <SignInButtons next={next} />
          </div>

          <p className="mt-8 text-xs text-muted-foreground">
            By signing in you agree to our Terms and acknowledge our Privacy
            Policy.
          </p>
        </div>
      </div>
    </main>
  );
}
