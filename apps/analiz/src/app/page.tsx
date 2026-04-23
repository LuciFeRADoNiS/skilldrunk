export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="max-w-2xl text-center">
        <p className="mb-2 text-xs uppercase tracking-[0.3em] text-neutral-500">
          part of skilldrunk
        </p>
        <h1 className="text-5xl font-semibold tracking-tight">Analiz</h1>
        <p className="mt-4 text-lg text-neutral-400">
          Skilldrunk Portal — Veri analiz modülü. Yakında.
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
      </div>
    </main>
  );
}
