import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/admin";
import { BriefView } from "../../brief-view";
import { generateBriefNow } from "../../actions";

export const dynamic = "force-dynamic";

type Brief = {
  id: string;
  brief_date: string;
  summary: string;
  body_md: string;
  model: string | null;
  pushed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export default async function DailyPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const { user } = await requireUser(`/daily/${date}`);
  const admin = createAdminClient();
  if (!admin) return <p className="p-8">admin client missing</p>;

  const { data: brief } = await admin
    .from("br_briefings")
    .select("*")
    .eq("user_id", user.id)
    .eq("brief_date", date)
    .maybeSingle<Brief>();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/"
          className="text-sm text-neutral-500 hover:text-neutral-300"
        >
          ← Bugün
        </Link>
        <h1 className="font-mono text-lg font-semibold">{date}</h1>
      </div>

      {brief ? (
        <BriefView brief={brief} />
      ) : (
        <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-950 p-8 text-center">
          <p className="text-sm text-neutral-400">
            Bu tarih için brief yok.
          </p>
          <form
            action={async () => {
              "use server";
              await generateBriefNow(date);
            }}
            className="mt-4"
          >
            <button
              type="submit"
              className="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
            >
              ✦ Şimdi oluştur
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
