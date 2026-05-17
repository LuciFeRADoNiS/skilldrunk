"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";

type NavItem = { href: string; label: string; icon: string };
type AppLink = { slug: string; title: string; url: string; subdomain: string | null; isCowork: boolean };

/**
 * Slide-up sheet triggered by the "More" tab in BottomTabNav.
 * Contains full nav list + ecosystem subdomain chips + sign-out.
 * Mobile-only — desktop uses the top nav directly.
 */
export function MoreSheet({
  trigger,
  nav,
  apps,
  userLabel,
}: {
  trigger: React.ReactNode;
  nav: NavItem[];
  apps: AppLink[];
  userLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-col items-center justify-center gap-1 touch-target text-neutral-400 active:text-orange-400"
        aria-label="Daha fazla"
      >
        <span aria-hidden className="text-[18px] leading-none">⋯</span>
        <span className="text-[10px]">Daha</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Kapat"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Sheet — fixed height so it always feels like a full drawer, not collapsing to content */}
          <div className="relative glass-strong rounded-t-3xl h-[85vh] overflow-y-auto safe-pb">
            {/* Drag handle */}
            <div className="sticky top-0 z-10 flex justify-center pt-3 pb-2 bg-gradient-to-b from-neutral-950/95 to-transparent">
              <span className="h-1 w-10 rounded-full bg-neutral-700" />
            </div>

            <div className="px-5 pb-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                  Menü
                </p>
                {userLabel && (
                  <p className="text-xs text-neutral-500">{userLabel}</p>
                )}
              </div>

              {/* Nav grid */}
              <div className="grid grid-cols-2 gap-2 mb-6">
                {nav.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="glass flex items-center gap-3 rounded-2xl px-4 py-3 active:ring-accent"
                  >
                    <span aria-hidden className="text-base">{n.icon}</span>
                    <span className="text-sm">{n.label}</span>
                  </Link>
                ))}
              </div>

              {/* Ecosystem chips */}
              {apps.length > 0 && (
                <>
                  <p className="mb-2 text-[11px] uppercase tracking-wider text-neutral-500">
                    Ekosistem
                  </p>
                  <div className="mb-6 flex flex-wrap gap-1.5">
                    {apps.map((a) => (
                      <a
                        key={a.slug}
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"
                      >
                        {a.isCowork && (
                          <span
                            className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400/80"
                            aria-label="Cowork-managed"
                          />
                        )}
                        <span className="font-mono">
                          {a.subdomain ?? a.slug}
                        </span>
                        <span aria-hidden className="text-neutral-500">↗</span>
                      </a>
                    ))}
                  </div>
                </>
              )}

              {/* Footer actions */}
              <div className="flex flex-col gap-2">
                <a
                  href="https://skimsoulfat.com/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="glass flex items-center justify-between rounded-2xl px-4 py-3 text-sm"
                >
                  <span>Kullanım Kılavuzu</span>
                  <span className="text-neutral-500">↗</span>
                </a>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="w-full rounded-2xl border border-red-900/40 bg-red-500/5 px-4 py-3 text-sm text-red-300 active:bg-red-500/10"
                  >
                    Çıkış Yap
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden trigger slot — keep available for layout consumers */}
      <span className="hidden">{trigger}</span>
    </>
  );
}
