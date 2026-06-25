import { requireOwner } from "@/lib/owner/auth";
import { PageShell } from "@/lib/owner/page-shell";

export const dynamic = "force-dynamic";

const BOTS = [
  { name: "Atlas", handle: "@ClaudeBotToken", status: "live", role: "Telegram + Suno + reminders" },
  { name: "Hermes", handle: "@HermesLesTaTBot", status: "live", role: "Orchestrator (NLP + write)" },
  { name: "Hephaestus", handle: "@EncoGrupBot", status: "live", role: "ENCO grup" },
  { name: "Mnemosyne", handle: "@KlauXThEBot", status: "live", role: "OpenClaw gateway" },
  { name: "Calliope", handle: "@skilldrunk_bot", status: "live", role: "Skilldrunk Telegram" },
];

export default async function OpsBotsPage() {
  await requireOwner();
  return (
    <PageShell
      eyebrow="ops · bots"
      title="Bot Health"
      description="LesTaT Inc. + Calliope canlı durum. Detay: agents.skilldrunk.com."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {BOTS.map((b) => (
          <div key={b.name} className="bd-surface" style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: 14 }}>{b.name}</strong>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: b.status === "live" ? "var(--bd-success)" : "var(--bd-danger)",
                  boxShadow: `0 0 6px ${b.status === "live" ? "var(--bd-success)" : "var(--bd-danger)"}`,
                }}
                aria-label={b.status}
              />
            </div>
            <p style={{ fontSize: 11, fontFamily: "var(--bd-font-mono)", color: "var(--bd-text-3)", margin: "4px 0 6px 0" }}>
              {b.handle}
            </p>
            <p style={{ fontSize: 12, color: "var(--bd-text-2)", margin: 0 }}>{b.role}</p>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: "var(--bd-text-3)", marginTop: 18 }}>
        Live RAM / restart count / model breakdown → Faz 2.5'te VPS state.json fetch ile.
      </p>
    </PageShell>
  );
}
