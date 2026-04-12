import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { getAdminUsers } from "@/app/actions/admin";
import { UserRoleActions } from "./user-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Manage Users — Admin" };

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-orange-500/10 text-orange-600 border-orange-200",
  moderator: "bg-blue-500/10 text-blue-600 border-blue-200",
  user: "",
};

export default async function AdminUsersPage() {
  const users = await getAdminUsers();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Manage Users</h1>

      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Display Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <a
                      href={`/u/${user.username}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium hover:underline"
                    >
                      @{user.username}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {user.display_name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${ROLE_COLORS[user.role] ?? ""}`}
                    >
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <UserRoleActions
                      userId={user.id}
                      currentRole={user.role}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
