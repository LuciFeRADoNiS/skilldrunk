import { redirect } from "next/navigation";

/**
 * /admin on marketplace is deprecated — moved to https://admin.skilldrunk.com.
 * All admin sub-paths (/admin/skills, /admin/users, /admin/reports) fall
 * through to this layout which redirects them to the dedicated admin subdomain.
 */
export default function AdminLayoutDeprecated({
  children: _children,
}: {
  children: React.ReactNode;
}) {
  void _children;
  redirect("https://admin.skilldrunk.com");
}
