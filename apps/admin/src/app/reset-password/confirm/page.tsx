import type { Metadata } from "next";
import { ConfirmForm } from "./confirm-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Yeni Şifre · Admin",
  robots: { index: false, follow: false },
};

/**
 * Supabase sends the user here with a recovery token in the URL hash.
 * The ConfirmForm (client component) reads the hash, exchanges it via
 * supabase.auth.setSession(), then lets user set a new password.
 */
export default function ResetConfirmPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Yeni Şifre Belirle
          </h1>
        </div>
        <ConfirmForm />
      </div>
    </main>
  );
}
