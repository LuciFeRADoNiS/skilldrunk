import type { Metadata } from "next";
import { RecoveryBridge } from "./recovery-bridge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Redirecting…",
  robots: { index: false, follow: false },
};

/**
 * Recovery bridge — some Supabase reset-password emails land here if the
 * redirect_to allowlist wasn't configured yet. Forward the hash fragment
 * (which carries the recovery token) to admin.skilldrunk.com so the user
 * can set their new password on the private admin subdomain.
 */
export default function ResetPasswordConfirmBridge() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-semibold">Yönlendiriliyor…</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Şifre sıfırlama için admin paneline geçiliyor.
        </p>
        <RecoveryBridge />
      </div>
    </main>
  );
}
