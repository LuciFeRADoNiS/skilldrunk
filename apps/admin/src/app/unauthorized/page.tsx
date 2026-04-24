import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Yetkin Yok</h1>
        <p className="mt-3 text-sm text-neutral-400">
          Bu alan sadece admin kullanıcılar içindir. Yanlışlıkla buradaysan:
        </p>
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <Link
            href="/login"
            className="rounded-md border border-neutral-800 px-4 py-2 hover:bg-neutral-900"
          >
            Farklı hesap ile giriş
          </Link>
          <a
            href="https://skilldrunk.com"
            className="rounded-md bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-600"
          >
            skilldrunk.com
          </a>
        </div>
      </div>
    </main>
  );
}
