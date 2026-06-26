import type { Metadata } from "next";
import { SignInButtons } from "@/components/sign-in-buttons";

export const metadata: Metadata = {
  title: "Giriş",
  description: "skilldrunk — küratörün kapısı.",
  robots: { index: false, follow: false },
};

const ERRORS: Record<string, string> = {
  access_denied: "Bu alan yalnız küratöre açık. Hesabın yetkili değil.",
  unauthorized: "Yetki gerekiyor — yalnız küratör girebilir.",
  auth: "Giriş başarısız oldu. Tekrar dene.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main
      data-shell="mine"
      data-mode="dark"
      data-palette="cellar"
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "var(--bg)",
        color: "var(--ink)",
        padding: "24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 40 }}>
          <span
            aria-hidden
            style={{ width: 9, height: 9, borderRadius: 999, background: "var(--accent)", boxShadow: "0 0 12px var(--accent)" }}
          />
          <span style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: "-0.01em" }}>
            skilldrunk
          </span>
        </div>

        <p className="kicker">the cellar door</p>
        <h1 className="display" style={{ fontSize: 34, margin: "4px 0 10px", lineHeight: 1.05 }}>
          Gir
          <span className="serif-italic" style={{ color: "var(--accent)" }}>
            iş
          </span>
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: 0, lineHeight: 1.5 }}>
          Bu kapının ardı küratörün alanı.
        </p>

        {error && (
          <div
            style={{
              marginTop: 22,
              borderRadius: "var(--radius, 10px)",
              border: "1px solid var(--wine)",
              background: "var(--wine-soft)",
              color: "var(--ink)",
              padding: "10px 12px",
              fontSize: 13,
            }}
          >
            {ERRORS[error] ?? ERRORS.auth}
          </div>
        )}

        <div style={{ marginTop: 28 }}>
          <SignInButtons next={next} />
        </div>

        <p style={{ marginTop: 40, fontSize: 11, color: "var(--ink-faint)", fontStyle: "italic" }}>
          Past here, it&apos;s the curator&apos;s domain.
        </p>
      </div>
    </main>
  );
}
