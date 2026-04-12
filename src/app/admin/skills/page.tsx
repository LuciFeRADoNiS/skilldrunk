import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { getAdminSkills } from "@/app/actions/admin";
import { SKILL_TYPE_LABELS, type SkillType } from "@/lib/types";
import { AdminSkillActions } from "./skill-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Manage Skills — Admin" };

export default async function AdminSkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status, page } = await searchParams;
  const skills = await getAdminSkills({
    status,
    page: page ? parseInt(page) : 1,
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Manage Skills</h1>

      {/* Status filter */}
      <div className="mb-6 flex gap-2">
        {["all", "published", "draft", "archived"].map((s) => (
          <a
            key={s}
            href={s === "all" ? "/admin/skills" : `/admin/skills?status=${s}`}
            className={`rounded-md border px-3 py-1.5 text-xs capitalize transition hover:bg-muted ${
              (s === "all" && !status) || s === status
                ? "border-foreground/30 bg-muted font-semibold"
                : ""
            }`}
          >
            {s}
          </a>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Author</th>
                <th className="px-4 py-3 font-medium text-right">Score</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {skills.map((skill) => (
                <tr key={skill.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <a
                      href={`/s/${skill.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium hover:underline"
                    >
                      {skill.title}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px]">
                      {SKILL_TYPE_LABELS[skill.type as SkillType] ?? skill.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        skill.status === "published"
                          ? "default"
                          : skill.status === "archived"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-[10px]"
                    >
                      {skill.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {skill.author?.username ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {skill.score}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AdminSkillActions
                      skillId={skill.id}
                      currentStatus={skill.status}
                    />
                  </td>
                </tr>
              ))}
              {skills.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No skills found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
