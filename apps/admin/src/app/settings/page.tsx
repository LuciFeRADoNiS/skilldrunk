import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/nav";
import { PasswordForm } from "./password-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { user, profile } = await requireAdmin("/settings");

  return (
    <>
      <AdminNav userLabel={profile?.username ?? user.email ?? undefined} />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <h1 className="sd-h1">Settings</h1>
          <span
            className="sd-mono"
            style={{ fontSize: 12, color: "var(--sd-text-3)" }}
          >
            {user.email} · {profile?.role ?? "—"}
          </span>
        </div>

        <section
          style={{
            background: "var(--sd-surface)",
            border: "1px solid var(--sd-border)",
            borderRadius: "var(--sd-r-lg)",
            padding: "20px 24px",
          }}
        >
          <h2 className="sd-h2" style={{ marginBottom: 4 }}>
            Şifre Değiştir
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "var(--sd-text-3)",
              marginBottom: 18,
            }}
          >
            Yeni şifre sadece bu hesap için değişir. En az 8 karakter.
          </p>
          <PasswordForm />
        </section>
      </main>
    </>
  );
}
