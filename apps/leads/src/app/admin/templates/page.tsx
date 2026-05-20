import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const { supabase } = await requireAdmin();
  const { data: templates } = await supabase
    .from("sd_lead_email_templates")
    .select("id, name, step_num, subject, active, updated_at")
    .order("step_num", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Email Templates</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Day 0 / Day 3 / Day 7 outreach şablonları. Placeholder:{" "}
            <code className="text-orange-400">{`{{first_name}} {{company}} {{title}} {{honorific}}`}</code>
          </p>
        </div>
        <Link
          href="/admin/templates/new"
          className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-orange-400"
        >
          + Yeni
        </Link>
      </div>

      {(!templates || templates.length === 0) && (
        <div className="rounded-lg border border-neutral-900 bg-neutral-950 p-6 text-center text-sm text-neutral-500">
          Henüz template yok. Cowork ENCO-Apollo-Outreach.md&apos;den Day 0/3/7&apos;yi seed edecek (M3 sonu).
        </div>
      )}

      <ul className="space-y-2">
        {templates?.map((t) => (
          <li key={t.id}>
            <Link
              href={`/admin/templates/${t.id}`}
              className="block rounded-lg border border-neutral-900 bg-neutral-950 p-4 hover:border-neutral-700"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="mt-1 truncate text-xs text-neutral-500">{t.subject}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs">
                  {t.step_num !== null && (
                    <span className="rounded bg-neutral-800 px-2 py-0.5 font-mono">
                      step {t.step_num}
                    </span>
                  )}
                  <span
                    className={`rounded px-2 py-0.5 ${
                      t.active
                        ? "bg-emerald-900/40 text-emerald-300"
                        : "bg-neutral-800 text-neutral-500"
                    }`}
                  >
                    {t.active ? "aktif" : "pasif"}
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
