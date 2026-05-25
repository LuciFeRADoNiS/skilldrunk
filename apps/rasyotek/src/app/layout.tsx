import type { Metadata } from "next";
import Link from "next/link";
import { Tracker } from "@skilldrunk/analytics/tracker";
import { GA4 } from "@skilldrunk/analytics/ga";
import { DocsLink } from "@skilldrunk/sd-ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rasyotek — MoveTech × Rasyotek Strateji",
  description:
    "MoveTech × Rasyotek partnership müzakere paketi + AI strateji asistanı",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        <DocsLink />
        <Nav />
        {children}
        <Tracker />
        <GA4 />
      </body>
    </html>
  );
}

function Nav() {
  return (
    <nav className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">
            skilldrunk
          </span>
          <span className="font-semibold tracking-tight">/ rasyotek</span>
        </Link>
        <div className="flex items-center gap-1 text-sm">
          <NavLink href="/" label="Paket" />
          <NavLink href="/chat" label="Chat" />
          <NavLink href="/notes" label="Notlar" />
          <NavLink href="/brief" label="Brief" />
          <NavLink href="/risks" label="Risk" />
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
    >
      {label}
    </Link>
  );
}
