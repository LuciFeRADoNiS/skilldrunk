import Link from "next/link";

export const dynamic = "force-dynamic";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <p className="mb-2 text-xs uppercase tracking-[0.3em] text-neutral-500">
          skilldrunk leads
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Erişim yok</h1>
        <p className="mt-3 text-sm text-neutral-400">
          Bu hesapta Lead Portal yetkisi yok. Erişim almak için Özgür&apos;e iletin.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md border border-neutral-800 px-4 py-2 text-sm hover:bg-neutral-900"
        >
          ← Girişe dön
        </Link>
      </div>
    </main>
  );
}
