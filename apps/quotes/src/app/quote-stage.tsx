"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Quote } from "@/lib/supabase";

type Mode = "daily" | "random" | "ai";

function todayIstanbul(): string {
  const d = new Date();
  const iso = new Date(d.getTime() + 3 * 60 * 60 * 1000) // UTC+3
    .toISOString()
    .split("T")[0];
  return new Date(iso + "T00:00:00").toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function QuoteStage({ initialQuote }: { initialQuote: Quote }) {
  const [quote, setQuote] = useState<Quote>(initialQuote);
  const [mode, setMode] = useState<Mode>("daily");
  const [pending, startTransition] = useTransition();
  const [animKey, setAnimKey] = useState(0);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [quote.id]);

  function fetchNew(m: "random" | "ai") {
    if (pending) return;
    setAiError(null);
    startTransition(async () => {
      try {
        const res =
          m === "random"
            ? await fetch("/api/random")
            : await fetch("/api/ai", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({}),
              });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (m === "ai" && err.error === "ai_disabled") {
            setAiError("AI kapalı (env yok) — random'a geç.");
            // Auto-fallback to random
            const r2 = await fetch("/api/random");
            if (r2.ok) {
              setQuote(await r2.json());
              setMode("random");
            }
            return;
          }
          setAiError(err.error ?? "Bir şey ters gitti.");
          return;
        }
        setQuote(await res.json());
        setMode(m);
      } catch (e) {
        setAiError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <>
      <ParticleCanvas />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-between px-6 py-8 sm:py-12">
        {/* Top */}
        <header className="w-full text-center">
          <p className="font-body text-[10px] uppercase tracking-[0.3em] text-neutral-500">
            part of skilldrunk
          </p>
          <h1 className="font-display mt-2 text-xl italic text-neutral-300 sm:text-2xl">
            Daily Dose
          </h1>
          <p className="mt-1 font-body text-xs text-neutral-600">
            {mode === "daily"
              ? `${todayIstanbul()} · günün sözü`
              : mode === "random"
                ? "rastgele ilham"
                : "✦ AI üretti"}
          </p>
        </header>

        {/* Quote */}
        <section
          key={animKey}
          className="animate-fadeUp flex w-full flex-1 flex-col items-center justify-center py-10"
        >
          <blockquote className="w-full text-center">
            <p className="font-display text-2xl leading-[1.35] text-neutral-100 sm:text-4xl sm:leading-[1.25]">
              &ldquo;{quote.quote_text}&rdquo;
            </p>
            <footer className="mt-6 flex flex-col items-center gap-1">
              <cite className="font-body text-sm not-italic text-neutral-400 sm:text-base">
                — {quote.author}
              </cite>
              {quote.category && (
                <span className="font-body text-[10px] uppercase tracking-wider text-neutral-600">
                  {quote.category}
                </span>
              )}
            </footer>
          </blockquote>

          {/* Nano detail */}
          {quote.nano_detail && (
            <div className="mt-10 max-w-lg">
              <div className="mb-3 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.25em] text-neutral-600">
                <span className="h-px w-8 bg-neutral-800" />
                <span>nano detay</span>
                <span>💡</span>
                <span className="h-px w-8 bg-neutral-800" />
              </div>
              <p className="font-body text-center text-sm italic leading-relaxed text-neutral-400 sm:text-base">
                {quote.nano_detail}
              </p>
            </div>
          )}
        </section>

        {/* Controls */}
        <footer className="w-full">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <button
              onClick={() => fetchNew("random")}
              disabled={pending}
              className="w-full max-w-xs rounded-full border border-neutral-800 bg-neutral-900/50 px-6 py-3 font-body text-sm text-neutral-200 transition hover:border-neutral-700 hover:bg-neutral-900 disabled:opacity-50 sm:w-auto"
            >
              🔀 Rastgele
            </button>
            <button
              onClick={() => fetchNew("ai")}
              disabled={pending}
              className="w-full max-w-xs rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-3 font-body text-sm font-medium text-white shadow-lg shadow-orange-500/20 transition hover:from-orange-600 hover:to-rose-600 disabled:opacity-60 sm:w-auto"
            >
              {pending && mode === "ai" ? "üretiliyor…" : "✦ Yeni İlham"}
            </button>
          </div>

          {aiError && (
            <p className="mt-3 text-center font-body text-[11px] text-amber-500/70">
              {aiError}
            </p>
          )}

          <p className="mt-6 text-center font-body text-[10px] text-neutral-700">
            <a
              href="https://skilldrunk.com"
              className="hover:text-neutral-500"
              target="_blank"
              rel="noreferrer"
            >
              skilldrunk.com
            </a>
            {" · "}
            <a
              href="/api/daily"
              className="hover:text-neutral-500"
              title="JSON endpoint"
            >
              api/daily
            </a>
          </p>
        </footer>
      </main>
    </>
  );
}

/* Particle background — canvas, respects prefers-reduced-motion */
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number };
    let particles: P[] = [];
    let raf = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = window.innerWidth * dpr;
      canvas!.height = window.innerHeight * dpr;
      canvas!.style.width = window.innerWidth + "px";
      canvas!.style.height = window.innerHeight + "px";
      ctx!.scale(dpr, dpr);
      spawn();
    }

    function spawn() {
      const count = Math.min(
        Math.floor((window.innerWidth * window.innerHeight) / 12000),
        80,
      );
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: Math.random() * 1.5 + 0.3,
        a: Math.random() * 0.4 + 0.1,
      }));
    }

    function tick() {
      ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = window.innerWidth;
        if (p.x > window.innerWidth) p.x = 0;
        if (p.y < 0) p.y = window.innerHeight;
        if (p.y > window.innerHeight) p.y = 0;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(249, 115, 22, ${p.a})`;
        ctx!.fill();
      }
      raf = requestAnimationFrame(tick);
    }

    resize();
    if (!prefersReduced) tick();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none fixed inset-0 z-0 opacity-40"
      aria-hidden
    />
  );
}
