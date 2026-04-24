import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Login · Admin",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const { next, reset } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs uppercase tracking-[0.3em] text-neutral-500">
            skilldrunk
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Admin Panel</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Sadece yetkili kullanıcılar.
          </p>
        </div>

        {reset === "1" && (
          <div className="mb-4 rounded-md border border-emerald-800 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
            Şifreniz güncellendi. Yeni şifrenizle giriş yapın.
          </div>
        )}

        <LoginForm next={next ?? "/"} />

        <div className="mt-6 flex items-center justify-between text-xs text-neutral-500">
          <Link href="/reset-password" className="hover:text-neutral-300">
            Şifremi unuttum
          </Link>
          <a
            href="https://skilldrunk.com"
            className="hover:text-neutral-300"
          >
            ← skilldrunk.com
          </a>
        </div>
      </div>
    </main>
  );
}
