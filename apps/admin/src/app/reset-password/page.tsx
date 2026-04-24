import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = {
  title: "Şifre Sıfırla · Admin",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Şifremi unuttum
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Email adresine sıfırlama linki göndereceğiz.
          </p>
        </div>

        <ResetForm />

        <div className="mt-6 text-center text-xs">
          <Link
            href="/login"
            className="text-neutral-500 hover:text-neutral-300"
          >
            ← Girişe dön
          </Link>
        </div>
      </div>
    </main>
  );
}
