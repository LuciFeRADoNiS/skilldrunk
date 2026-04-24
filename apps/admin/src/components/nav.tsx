import Link from "next/link";
import { signOut } from "@/app/actions/auth";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/ai", label: "AI" },
  { href: "/analytics", label: "Analytics" },
  { href: "/apps", label: "Apps" },
  { href: "/skills", label: "Skills" },
  { href: "/users", label: "Users" },
  { href: "/reports", label: "Reports" },
  { href: "/notifications", label: "Notifications" },
  { href: "/audit", label: "Audit" },
];

export function AdminNav({ userLabel }: { userLabel?: string }) {
  return (
    <header className="border-b border-neutral-900 bg-neutral-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-mono text-sm font-bold"
          >
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500" />
            admin
          </Link>
          <nav className="flex gap-4 text-sm text-neutral-400">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="hover:text-neutral-200"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          {userLabel && <span>{userLabel}</span>}
          <form action={signOut}>
            <button className="rounded border border-neutral-800 px-2.5 py-1 hover:bg-neutral-900">
              Çıkış
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
