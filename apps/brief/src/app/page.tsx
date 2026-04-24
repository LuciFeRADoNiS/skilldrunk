import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function BriefHome() {
  const { user } = await requireUser("/");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16">
      <div className="w-full text-center">
        <p className="mb-2 text-xs uppercase tracking-[0.3em] text-neutral-500">
          part of skilldrunk
        </p>
        <h1 className="text-5xl font-semibold tracking-tight">Brief</h1>
        <p className="mt-4 text-lg text-neutral-400">
          Briefings modülü. İçerik yakında.
        </p>

        <div className="mt-10 flex items-center justify-center gap-3 text-sm text-neutral-500">
          <span className="rounded-full border border-neutral-800 px-3 py-1">
            Phase 0
          </span>
          <span className="rounded-full border border-neutral-800 px-3 py-1">
            Next.js 16
          </span>
          <span className="rounded-full border border-neutral-800 px-3 py-1">
            Supabase
          </span>
        </div>

        <p className="mt-12 font-mono text-xs text-neutral-600">
          logged in as {user.email ?? user.id.slice(0, 8)}
        </p>
      </div>
    </main>
  );
}
