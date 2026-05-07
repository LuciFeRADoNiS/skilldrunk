import { requireAdmin } from "@/lib/auth";
import { getCostThisWeek } from "@/lib/queries";
import { Shell } from "@/components/Shell";

export const dynamic = "force-dynamic";

export default async function CostPage() {
  await requireAdmin("/cost");
  const days = await getCostThisWeek();

  // Group by provider
  const byProvider = new Map<string, number>();
  let total = 0;
  for (const d of days) {
    byProvider.set(d.provider, (byProvider.get(d.provider) ?? 0) + d.cost_usd);
    total += d.cost_usd;
  }

  return (
    <Shell>
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Cost</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Son 7 gün API kullanımı (Anthropic + OpenAI + Gemini).
      </p>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Card label="Bu hafta toplam" value={`$${total.toFixed(2)}`} />
        <Card
          label="En yüksek provider"
          value={
            [...byProvider.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
            "—"
          }
        />
        <Card label="Gün sayısı" value={String(days.length)} />
      </div>

      {days.length === 0 ? (
        <div className="border border-neutral-800 rounded-lg p-8 text-center text-neutral-500">
          Henüz cost verisi yok. <code>tasks-dashboard-cost-sync</code> günlük
          03:30&apos;da çalışacak.
        </div>
      ) : (
        <div className="border border-neutral-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-xs uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-4 py-2 text-left">Tarih</th>
                <th className="px-4 py-2 text-left">Provider</th>
                <th className="px-4 py-2 text-left">Bot</th>
                <th className="px-4 py-2 text-right">Input</th>
                <th className="px-4 py-2 text-right">Output</th>
                <th className="px-4 py-2 text-right">$</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d, i) => (
                <tr key={i} className="border-t border-neutral-800">
                  <td className="px-4 py-2 font-mono text-xs">{d.date}</td>
                  <td className="px-4 py-2">{d.provider}</td>
                  <td className="px-4 py-2 text-neutral-400">{d.bot}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs">
                    {d.input_tokens.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs">
                    {d.output_tokens.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    ${d.cost_usd.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-neutral-800 rounded-lg p-4 bg-neutral-900/40">
      <div className="text-xs uppercase tracking-wider text-neutral-500 mb-1">
        {label}
      </div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
