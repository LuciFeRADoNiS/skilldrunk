import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { adminClient } from "@/lib/context";

export const dynamic = "force-dynamic";

export default async function RisksPage() {
  await requireUser("/risks");
  const sb = adminClient();

  const { data: risks } = await sb
    .from("rt_risks")
    .select("*")
    .order("score", { ascending: false });

  const grouped: Record<string, typeof risks> = {
    red: [],
    orange: [],
    yellow: [],
    green: [],
  };
  (risks ?? []).forEach((r) => {
    const key = r.priority ?? "green";
    if (grouped[key]) grouped[key].push(r);
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/"
        className="mb-6 inline-block text-xs uppercase tracking-wider text-neutral-500 hover:text-neutral-300"
      >
        ← Paket
      </Link>

      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Risk Matrisi</h1>
        <p className="mt-2 text-sm text-neutral-400">
          {risks?.length ?? 0} adversarial senaryo, Red-Team Brief'ten canlı
          takip. Yeni bilgi geldikçe ZeuX-Rasyotek'e söyle, skorları güncellesin.
        </p>
      </header>

      {(["red", "orange", "yellow", "green"] as const).map((color) => {
        const items = grouped[color];
        if (!items || items.length === 0) return null;
        return (
          <section key={color} className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 text-sm uppercase tracking-wider text-neutral-400">
              <Dot color={color} /> {color.toUpperCase()} ({items.length})
            </h2>
            <div className="space-y-3">
              {items.map((r: any) => (
                <RiskCard key={r.risk_key} risk={r} />
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}

function Dot({ color }: { color: string }) {
  const colors: Record<string, string> = {
    red: "bg-rose-500",
    orange: "bg-orange-500",
    yellow: "bg-amber-500",
    green: "bg-emerald-500",
  };
  return (
    <span className={`inline-block h-2 w-2 rounded-full ${colors[color]}`} />
  );
}

function RiskCard({ risk }: { risk: any }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold text-neutral-500">
          {risk.risk_key}
        </span>
        <span className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-[10px] uppercase tracking-wider text-neutral-300">
          {risk.status}
        </span>
        <span className="ml-auto text-sm">
          L=<span className="font-semibold">{risk.likelihood}</span> × I=
          <span className="font-semibold">{risk.impact}</span> ={" "}
          <span className="font-semibold text-amber-300">{risk.score}</span>
        </span>
      </div>
      <h3 className="mb-2 font-medium">{risk.scenario_title}</h3>
      <p className="mb-3 text-sm text-neutral-400">{risk.description}</p>
      {risk.mitigation_md && (
        <details className="text-sm">
          <summary className="cursor-pointer text-neutral-400 hover:text-neutral-200">
            Mitigation aksiyonları
          </summary>
          <p className="mt-2 whitespace-pre-wrap text-neutral-300">
            {risk.mitigation_md}
          </p>
        </details>
      )}
      {risk.evidence_md && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-neutral-400 hover:text-neutral-200">
            Kanıt zinciri
          </summary>
          <p className="mt-2 whitespace-pre-wrap text-neutral-300">
            {risk.evidence_md}
          </p>
        </details>
      )}
    </div>
  );
}
