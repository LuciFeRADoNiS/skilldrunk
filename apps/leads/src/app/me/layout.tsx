import Link from "next/link";
import { requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireStaff();

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link href="/me" className="text-sm font-semibold tracking-tight">
            Lead Portal
          </Link>
          <div className="flex items-center gap-4 text-xs text-neutral-400">
            <Link href="/me/history" className="hover:text-neutral-100">Geçmiş</Link>
            <span className="text-neutral-600">{user.email}</span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
    </div>
  );
}
