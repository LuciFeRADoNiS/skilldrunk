import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/nav";
import { SkillActions } from "./skill-actions";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  published: "bg-emerald-500/10 text-emerald-400 border-emerald-900",
  archived: "bg-amber-500/10 text-amber-400 border-amber-900",
  draft: "bg-neutral-500/10 text-neutral-400 border-neutral-800",
};

type Row = {
  id: string;
  slug: string;
  title: string;
  type: string;
  status: string;
  score: number;
  created_at: string;
  sd_profiles: { username: string } | null;
};

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const { supabase, profile } = await requireAdmin("/skills");

  let query = supabase
    .from("sd_skills")
    .select(
      "id, slug, title, type, status, score, created_at, sd_profiles!sd_skills_author_id_fkey(username)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (status) query = query.eq("status", status);

  const { data } = await query.returns<Row[]>();
  const skills = data ?? [];

  return (
    <>
      <AdminNav userLabel={profile?.display_name ?? undefined} />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-semibold">Skills</h1>

        <div className="mb-6 flex gap-2">
          {["all", "published", "draft", "archived"].map((s) => (
            <a
              key={s}
              href={s === "all" ? "/skills" : `/skills?status=${s}`}
              className={`rounded-md border px-3 py-1.5 text-xs capitalize ${
                (s === "all" && !status) || s === status
                  ? "border-orange-500 bg-orange-500/10 text-orange-400"
                  : "border-neutral-800 text-neutral-400 hover:bg-neutral-900"
              }`}
            >
              {s}
            </a>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border border-neutral-900">
          <table className="w-full text-sm">
            <thead className="bg-neutral-950 text-left text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Title</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Author</th>
                <th className="px-4 py-2.5 text-right font-medium">Score</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {skills.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2.5">
                    <a
                      href={`https://skilldrunk.com/s/${s.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {s.title}
                    </a>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-neutral-400">
                    {s.type}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${STATUS_COLORS[s.status] ?? ""}`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-neutral-400">
                    {s.sd_profiles?.username ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {s.score}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <SkillActions skillId={s.id} currentStatus={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
