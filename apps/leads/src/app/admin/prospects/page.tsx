import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { q } = await searchParams;
  const search = (q ?? "").trim();

  let query = supabase
    .from("sd_lead_prospects")
    .select("id, name, email, title, company, city, industry, score, apollo_id")
    .order("score", { ascending: false, nullsFirst: false })
    .order("name", { ascending: true })
    .limit(200);

  if (search) {
    // Simple ILIKE across name/email/company (max 200 rows so fine)
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`,
    );
  }

  const { data: prospects, count } = await query;

  // Separate count for total
  const { count: total } = await supabase
    .from("sd_lead_prospects")
    .select("*", { count: "exact", head: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Prospects</h1>
        <p className="mt-1 text-sm text-neutral-400">
          {total ?? 0} kayıt · Apollo + manuel import. Cowork POST{" "}
          <code className="text-orange-400">/api/leads/import-apollo</code> ile besler.
        </p>
      </div>

      <form className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="İsim, email veya şirket ara..."
          className="flex-1 rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md border border-neutral-800 px-4 py-2 text-sm hover:bg-neutral-900"
        >
          Ara
        </button>
        {search && (
          <Link
            href="/admin/prospects"
            className="rounded-md px-4 py-2 text-sm text-neutral-400 hover:text-neutral-100"
          >
            Temizle
          </Link>
        )}
      </form>

      {(!prospects || prospects.length === 0) && (
        <div className="rounded-lg border border-neutral-900 bg-neutral-950 p-6 text-center text-sm text-neutral-500">
          {search ? "Eşleşme bulunamadı." : "Henüz prospect yok. Cowork import edecek."}
        </div>
      )}

      {prospects && prospects.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-neutral-900">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900/50 text-xs uppercase text-neutral-400">
              <tr>
                <th className="px-4 py-2">Skor</th>
                <th className="px-4 py-2">İsim</th>
                <th className="px-4 py-2">Ünvan</th>
                <th className="px-4 py-2">Şirket</th>
                <th className="px-4 py-2">Şehir</th>
                <th className="px-4 py-2">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {prospects.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-950">
                  <td className="px-4 py-2 font-mono text-xs">{p.score ?? "-"}</td>
                  <td className="px-4 py-2">{p.name}</td>
                  <td className="px-4 py-2 text-neutral-400">{p.title ?? "-"}</td>
                  <td className="px-4 py-2">{p.company ?? "-"}</td>
                  <td className="px-4 py-2 text-neutral-400">{p.city ?? "-"}</td>
                  <td className="px-4 py-2 font-mono text-xs text-neutral-400">{p.email ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
