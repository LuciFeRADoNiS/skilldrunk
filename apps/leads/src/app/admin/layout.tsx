import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAdmin();

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-sm font-semibold tracking-tight">
              Leads · Admin
            </Link>
            <nav className="flex items-center gap-4 text-xs text-neutral-400">
              <Link href="/admin" className="hover:text-neutral-100">Dashboard</Link>
              <Link href="/admin/new" className="hover:text-neutral-100">Yeni Görev</Link>
              <Link href="/admin/prospects" className="hover:text-neutral-100">Prospects</Link>
              <Link href="/admin/staff" className="hover:text-neutral-100">Staff</Link>
              <Link href="/admin/templates" className="hover:text-neutral-100">Templates</Link>
              <Link href="/admin/activity" className="hover:text-neutral-100">Aktivite</Link>
            </nav>
          </div>
          <span className="text-xs text-neutral-500">{user.email ?? user.id.slice(0, 8)}</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
