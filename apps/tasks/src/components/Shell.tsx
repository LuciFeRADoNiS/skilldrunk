import Link from "next/link";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/tasks", label: "Cowork Tasks" },
  { href: "/bots", label: "Bot Health" },
  { href: "/cost", label: "Cost" },
  { href: "/alerts", label: "Alerts" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-800 px-6 py-3 flex items-center gap-6 bg-neutral-950">
        <Link href="/" className="font-semibold tracking-tight">
          tasks · skilldrunk
        </Link>
        <nav className="flex gap-4 text-sm text-neutral-400">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="hover:text-neutral-100 transition"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto text-xs text-neutral-500">admin only</div>
      </header>
      <main className="flex-1 px-6 py-6 max-w-7xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
