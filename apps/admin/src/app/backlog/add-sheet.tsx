"use client";

import { useEffect, useRef, useState } from "react";

type ServerAction = (formData: FormData) => Promise<void> | void;

/**
 * Floating "+ Yeni" button that opens a bottom sheet form on mobile,
 * inline form on desktop. Calls a server action on submit.
 */
export function AddBacklogSheet({
  action,
  projects,
}: {
  action: ServerAction;
  projects: string[];
}) {
  const [open, setOpen] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setTimeout(() => titleRef.current?.focus(), 100);
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

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
        className="rounded-full bg-orange-500/20 px-4 py-1.5 text-sm font-medium text-orange-200 ring-1 ring-orange-500/40 active:scale-95 transition"
      >
        + Yeni
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Kapat"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <div className="relative glass-strong rounded-t-3xl min-h-[60vh] max-h-[90vh] overflow-y-auto safe-pb">
            <div className="sticky top-0 z-10 flex justify-center pt-3 pb-2 bg-gradient-to-b from-neutral-950/95 to-transparent">
              <span className="h-1 w-10 rounded-full bg-neutral-700" />
            </div>

            <form
              action={async (fd) => {
                await action(fd);
                setOpen(false);
              }}
              className="px-5 pb-6 space-y-3"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                Yeni iş
              </p>

              <div>
                <label className="text-[11px] text-neutral-500">Başlık</label>
                <input
                  ref={titleRef}
                  name="title"
                  required
                  maxLength={200}
                  placeholder="örn. Admin /ai sayfası mobile glass"
                  className="mt-1 w-full rounded-xl bg-neutral-900/60 border border-neutral-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-neutral-500">Proje</label>
                  <input
                    name="project"
                    list="bl-projects"
                    placeholder="general"
                    className="mt-1 w-full rounded-xl bg-neutral-900/60 border border-neutral-800 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                  />
                  <datalist id="bl-projects">
                    {projects.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="text-[11px] text-neutral-500">
                    Öncelik (1-5)
                  </label>
                  <select
                    name="priority"
                    defaultValue="3"
                    className="mt-1 w-full rounded-xl bg-neutral-900/60 border border-neutral-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                  >
                    <option value="1">1 — kritik</option>
                    <option value="2">2 — yüksek</option>
                    <option value="3">3 — normal</option>
                    <option value="4">4 — düşük</option>
                    <option value="5">5 — fikir</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-neutral-500">
                  Tag&apos;ler (virgülle)
                </label>
                <input
                  name="tags"
                  placeholder="mobile, glass, urgent"
                  className="mt-1 w-full rounded-xl bg-neutral-900/60 border border-neutral-800 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-2xl border border-neutral-800 px-4 py-3 text-sm text-neutral-300"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="flex-[2] rounded-2xl bg-orange-500/20 px-4 py-3 text-sm font-medium text-orange-200 ring-1 ring-orange-500/40"
                >
                  Ekle (sıraya)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
