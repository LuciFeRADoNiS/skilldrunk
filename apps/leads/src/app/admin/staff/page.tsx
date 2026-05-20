import { requireAdmin } from "@/lib/auth";
import { StaffCreateForm } from "./create-form";
import { ToggleActiveButton } from "./toggle-active";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const { supabase } = await requireAdmin();
  const { data: staff } = await supabase
    .from("sd_lead_staff")
    .select("id, email, full_name, phone, team, active, user_id, created_at")
    .order("active", { ascending: false })
    .order("full_name", { ascending: true });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Lead Portal erişimi olan satış ekibi. Auth user&apos;ı ilk magic-link login&apos;de otomatik bağlanır.
        </p>
      </div>

      <section className="rounded-lg border border-neutral-900 bg-neutral-950 p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Yeni Personel
        </h2>
        <StaffCreateForm />
      </section>

      {(!staff || staff.length === 0) && (
        <div className="rounded-lg border border-neutral-900 bg-neutral-950 p-6 text-center text-sm text-neutral-500">
          Henüz personel yok. Cowork ENCO seed yapacak.
        </div>
      )}

      {staff && staff.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-neutral-900">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900/50 text-xs uppercase text-neutral-400">
              <tr>
                <th className="px-4 py-2">Aktif</th>
                <th className="px-4 py-2">İsim</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Takım</th>
                <th className="px-4 py-2">Auth</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-neutral-950">
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs ${
                        s.active
                          ? "bg-emerald-900/40 text-emerald-300"
                          : "bg-neutral-800 text-neutral-500"
                      }`}
                    >
                      {s.active ? "aktif" : "pasif"}
                    </span>
                  </td>
                  <td className="px-4 py-2">{s.full_name ?? "-"}</td>
                  <td className="px-4 py-2 font-mono text-xs">{s.email}</td>
                  <td className="px-4 py-2 text-neutral-400">{s.team ?? "-"}</td>
                  <td className="px-4 py-2">
                    {s.user_id ? (
                      <span className="text-xs text-emerald-400">bağlı</span>
                    ) : (
                      <span className="text-xs text-neutral-500">login bekliyor</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <ToggleActiveButton staffId={s.id} active={s.active} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
