"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buildCommands, type MineCommand } from "@/lib/mine/commands";

const MODES = ["dark", "light"] as const;
const PALETTES = ["cellar", "ultraviolet", "cobalt", "oxblood"] as const;
type Mode = (typeof MODES)[number];
type Palette = (typeof PALETTES)[number];

function shellEl(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>('[data-shell="mine"]');
}

/**
 * Mine top-bar controls — ⌘K command palette + mode/palette theme toggle.
 * Rendered inside the Cellar shell (via OwnerLayout's `search` slot), so the
 * var(--bg)/var(--accent)/... tokens resolve. Sets data-mode/data-palette on the
 * [data-shell="mine"] element and persists to localStorage.
 */
export function MineControls() {
  const router = useRouter();
  const commands = useMemo(() => buildCommands(), []);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<Mode>("dark");
  const [palette, setPalette] = useState<Palette>("cellar");
  const inputRef = useRef<HTMLInputElement>(null);

  // Hydrate persisted theme prefs onto the shell element.
  useEffect(() => {
    const el = shellEl();
    if (!el) return;
    const m = (localStorage.getItem("sd-mode") as Mode | null) ??
      (el.getAttribute("data-mode") as Mode | null) ?? "dark";
    const p = (localStorage.getItem("sd-palette") as Palette | null) ??
      (el.getAttribute("data-palette") as Palette | null) ?? "cellar";
    el.setAttribute("data-mode", m);
    el.setAttribute("data-palette", p);
    setMode(m);
    setPalette(p);
  }, []);

  const applyMode = useCallback((m: Mode) => {
    shellEl()?.setAttribute("data-mode", m);
    localStorage.setItem("sd-mode", m);
    setMode(m);
  }, []);

  const applyPalette = useCallback((p: Palette) => {
    shellEl()?.setAttribute("data-palette", p);
    localStorage.setItem("sd-palette", p);
    setPalette(p);
  }, []);

  // Global ⌘K / Ctrl+K to toggle, Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q),
    );
  }, [query, commands]);

  const run = useCallback(
    (c?: MineCommand) => {
      if (!c) return;
      setOpen(false);
      if (c.external) window.open(c.href, "_blank", "noopener,noreferrer");
      else router.push(c.href);
    },
    [router],
  );

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(filtered[active]);
    }
  };

  const btn: React.CSSProperties = {
    background: "transparent",
    border: "1px solid var(--bd-border)",
    color: "var(--bd-text-2)",
    borderRadius: "var(--bd-radius-sm)",
    padding: "6px 9px",
    cursor: "pointer",
    fontSize: 13,
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button type="button" style={btn} onClick={() => setOpen(true)} aria-label="Komut paleti (⌘K)">
        <span aria-hidden>⌕</span>
        <span style={{ opacity: 0.8 }}>Ara</span>
        <kbd
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 10,
            border: "1px solid var(--bd-border)",
            borderRadius: 4,
            padding: "1px 4px",
            color: "var(--bd-text-3)",
          }}
        >
          ⌘K
        </kbd>
      </button>

      <button
        type="button"
        style={btn}
        onClick={() => applyMode(mode === "dark" ? "light" : "dark")}
        aria-label="Aydınlık/karanlık mod"
        title={mode === "dark" ? "Karanlık" : "Aydınlık"}
      >
        {mode === "dark" ? "☾" : "☀"}
      </button>

      <button
        type="button"
        style={btn}
        onClick={() => applyPalette(PALETTES[(PALETTES.indexOf(palette) + 1) % PALETTES.length])}
        aria-label="Palet değiştir"
        title={`Palet: ${palette}`}
      >
        <span
          aria-hidden
          style={{ width: 12, height: 12, borderRadius: 999, background: "var(--accent)", display: "inline-block" }}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Komut paleti"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,.45)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: "12vh",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={onListKey}
            style={{
              width: "min(560px, 92vw)",
              background: "var(--bg-elevated)",
              color: "var(--ink)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-md, 14px)",
              boxShadow: "var(--shadow-lg)",
              overflow: "hidden",
            }}
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              placeholder="Git veya ara…"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "14px 16px",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid var(--line)",
                color: "var(--ink)",
                fontSize: 15,
                outline: "none",
                fontFamily: "var(--font-sans, sans-serif)",
              }}
            />
            <div style={{ maxHeight: 360, overflowY: "auto", padding: 6 }}>
              {filtered.length === 0 ? (
                <p style={{ padding: "16px", color: "var(--ink-faint)", fontSize: 13, margin: 0 }}>
                  Eşleşme yok.
                </p>
              ) : (
                filtered.map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => run(c)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 12px",
                      borderRadius: "var(--radius-sm, 8px)",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      background: i === active ? "var(--accent-soft)" : "transparent",
                      color: i === active ? "var(--accent-ink)" : "var(--ink)",
                      fontSize: 14,
                    }}
                  >
                    {c.icon && <span aria-hidden style={{ width: 18 }}>{c.icon}</span>}
                    <span style={{ flex: 1 }}>{c.label}</span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: 10,
                        letterSpacing: ".08em",
                        textTransform: "uppercase",
                        color: "var(--ink-faint)",
                      }}
                    >
                      {c.group}
                      {c.external ? " ↗" : ""}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
