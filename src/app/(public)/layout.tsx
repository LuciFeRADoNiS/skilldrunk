import { requireAdmin } from "@/lib/owner/auth";

/**
 * Private apex (D3): the former public marketplace routes (/feed, /arena,
 * /s/[slug], /search, /find, /tag, /u, /new, /docs, /about, /todus, /llms.txt)
 * are now CURATOR-ONLY. This group layout gates them all behind requireAdmin —
 * non-admins are bounced to /login. Data is further walled at the DB by the
 * cutover RLS migration (0025).
 */
export const dynamic = "force-dynamic";

export default async function PublicGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return <>{children}</>;
}
