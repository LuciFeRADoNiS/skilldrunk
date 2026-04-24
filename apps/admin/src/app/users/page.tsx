import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/nav";
import { UserActions } from "./user-actions";

export const dynamic = "force-dynamic";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-orange-500/10 text-orange-400 border-orange-900",
  moderator: "bg-blue-500/10 text-blue-400 border-blue-900",
  user: "bg-neutral-500/10 text-neutral-400 border-neutral-800",
};

type Row = {
  id: string;
  username: string;
  display_name: string | null;
  role: string;
  created_at: string;
};

export default async function UsersPage() {
  const { supabase, profile } = await requireAdmin("/users");

  const { data } = await supabase
    .from("sd_profiles")
    .select("id, username, display_name, role, created_at")
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<Row[]>();

  const users = data ?? [];

  return (
    <>
      <AdminNav userLabel={profile?.display_name ?? undefined} />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-semibold">Users</h1>
        <div className="overflow-x-auto rounded-lg border border-neutral-900">
          <table className="w-full text-sm">
            <thead className="bg-neutral-950 text-left text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Username</th>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Joined</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2.5">
                    <a
                      href={`https://skilldrunk.com/u/${u.username}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      @{u.username}
                    </a>
                  </td>
                  <td className="px-4 py-2.5 text-neutral-400">
                    {u.display_name ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${ROLE_COLORS[u.role] ?? ""}`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-neutral-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <UserActions userId={u.id} currentRole={u.role} />
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
