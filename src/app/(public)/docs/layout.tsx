import Link from "next/link";
import type { ReactNode } from "react";

const nav = [
  { href: "/docs", label: "Overview" },
  { href: "/docs/api", label: "REST API" },
  { href: "/docs/mcp", label: "MCP server" },
];

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2 font-mono text-lg font-bold">
            <span className="inline-block h-3 w-3 rounded-full bg-orange-500" />
            skilldrunk <span className="text-sm font-normal text-muted-foreground">docs</span>
          </Link>
          <Link href="/settings/api-keys" className="text-sm hover:underline">
            API keys →
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-10 md:grid-cols-[200px_1fr]">
        <aside className="md:sticky md:top-6 md:self-start">
          <nav className="flex flex-col gap-1 text-sm">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <article className="prose prose-neutral max-w-none">{children}</article>
      </div>
    </div>
  );
}
