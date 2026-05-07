import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/nav";
import { PasswordForm } from "./password-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { user, profile } = await requireAdmin("/settings");

  return (
    <>
      <AdminNav userLabel={profile?.username ?? user.email ?? undefined} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Settings</h1>
        <p className="text-sm text-neutral-500 mb-8">
          {user.email} · {profile?.role ?? "—"}
        </p>

        <section className="border border-neutral-800 rounded-lg p-6 bg-neutral-900/30">
          <h2 className="text-lg font-semibold mb-1">Şifre Değiştir</h2>
          <p className="text-sm text-neutral-500 mb-5">
            Yeni şifre sadece bu hesap için değişir. En az 8 karakter.
          </p>
          <PasswordForm />
        </section>
      </main>
    </>
  );
}
