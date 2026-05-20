"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buildContext, renderTemplate } from "@/lib/template-render";

type Prospect = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  company: string | null;
  city: string | null;
  industry: string | null;
  linkedin_url: string | null;
};

type Template = {
  id: number;
  name: string;
  step_num: number | null;
  subject: string;
  body_md: string;
};

type Task = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  rejection_reason: string | null;
  due_at: string | null;
};

const SUBMITTABLE = ["assigned", "in_progress", "rejected"];

export function TaskCard({
  task,
  prospect,
  template,
  defaultHonorific,
  savedResult,
}: {
  task: Task;
  prospect: Prospect;
  template: Template;
  defaultHonorific: string;
  savedResult: Record<string, unknown>;
}) {
  const router = useRouter();
  const [honorific, setHonorific] = useState<string>(defaultHonorific);
  const [sentAt, setSentAt] = useState<string>(() => {
    const saved = savedResult.sent_at as string | undefined;
    if (saved) return saved.slice(0, 16);
    const d = new Date();
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().slice(0, 16);
  });
  const [channelConfirmed, setChannelConfirmed] = useState(
    Boolean(savedResult.channel_confirmed),
  );
  const [notes, setNotes] = useState<string>(
    (savedResult.personalization_notes as string | null) ?? "",
  );
  const [copyState, setCopyState] = useState<"subject" | "body" | "all" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const ctx = useMemo(() => buildContext(prospect, honorific), [prospect, honorific]);
  const renderedSubject = useMemo(
    () => renderTemplate(template.subject, ctx),
    [template.subject, ctx],
  );
  const renderedBody = useMemo(
    () => renderTemplate(template.body_md, ctx),
    [template.body_md, ctx],
  );

  // Session tracking — start on mount, end on unmount/beforeunload
  const sessionIdRef = useRef<number | null>(null);
  const startCalled = useRef(false);

  useEffect(() => {
    if (startCalled.current) return;
    startCalled.current = true;

    (async () => {
      try {
        const r = await fetch(`/api/me/task/${task.id}/start`, {
          method: "POST",
        });
        if (r.ok) {
          const data = await r.json();
          if (data?.session_id) sessionIdRef.current = data.session_id;
        }
      } catch {
        /* non-fatal */
      }
    })();

    const endSession = () => {
      const sid = sessionIdRef.current;
      if (!sid) return;
      // Use sendBeacon for unload reliability
      const url = `/api/me/session/${sid}/end`;
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([JSON.stringify({})], { type: "application/json" }));
      } else {
        // Fallback fetch with keepalive
        fetch(url, { method: "POST", keepalive: true }).catch(() => {});
      }
      sessionIdRef.current = null;
    };

    window.addEventListener("beforeunload", endSession);
    window.addEventListener("pagehide", endSession);
    return () => {
      endSession();
      window.removeEventListener("beforeunload", endSession);
      window.removeEventListener("pagehide", endSession);
    };
  }, [task.id]);

  async function copyText(kind: "subject" | "body" | "all") {
    const text =
      kind === "subject"
        ? renderedSubject
        : kind === "body"
          ? renderedBody
          : `${renderedSubject}\n\n${renderedBody}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopyState(kind);
      setTimeout(() => setCopyState(null), 1600);
    } catch {
      // fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopyState(kind);
      setTimeout(() => setCopyState(null), 1600);
    }
  }

  async function handleSubmit() {
    if (!channelConfirmed || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const r = await fetch(`/api/me/task/${task.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sent_at: new Date(sentAt).toISOString(),
          channel_confirmed: true,
          personalization_notes: notes || undefined,
          honorific,
        }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setSubmitError(data.error ?? `HTTP ${r.status}`);
        setSubmitting(false);
        return;
      }
      router.refresh();
      router.push("/me");
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Bilinmeyen hata");
      setSubmitting(false);
    }
  }

  const isSubmittable = SUBMITTABLE.includes(task.status);
  const isSent = task.status === "email_sent" || task.status === "replied";

  return (
    <article className="space-y-5 pb-32">
      {/* Header */}
      <header>
        <h1 className="text-xl font-semibold leading-tight">{task.title}</h1>
        {task.due_at && (
          <p className="mt-1 text-xs text-neutral-500">
            Son: {new Date(task.due_at).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        )}
        {task.rejection_reason && (
          <div className="mt-3 rounded-md border border-red-900 bg-red-950/20 px-3 py-2 text-xs text-red-300">
            <p className="font-medium">Red sebebi:</p>
            <p>{task.rejection_reason}</p>
          </div>
        )}
      </header>

      {/* Prospect card */}
      <section className="rounded-xl border border-neutral-900 bg-neutral-950 p-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Müşteri
        </h2>
        <p className="text-base font-medium">{prospect.name}</p>
        <p className="text-sm text-neutral-400">
          {prospect.title}
          {prospect.company && ` · ${prospect.company}`}
        </p>
        <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
          {prospect.email && (
            <div>
              <dt className="text-neutral-500">E-posta</dt>
              <dd className="font-mono">{prospect.email}</dd>
            </div>
          )}
          {prospect.phone && (
            <div>
              <dt className="text-neutral-500">Telefon</dt>
              <dd className="font-mono">{prospect.phone}</dd>
            </div>
          )}
          {prospect.city && (
            <div>
              <dt className="text-neutral-500">Şehir</dt>
              <dd>{prospect.city}</dd>
            </div>
          )}
          {prospect.industry && (
            <div>
              <dt className="text-neutral-500">Sektör</dt>
              <dd>{prospect.industry}</dd>
            </div>
          )}
          {prospect.linkedin_url && (
            <div className="sm:col-span-2">
              <dt className="text-neutral-500">LinkedIn</dt>
              <dd>
                <a
                  href={prospect.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-400 hover:underline"
                >
                  Profili aç ↗
                </a>
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* Honorific selector */}
      <section className="rounded-xl border border-neutral-900 bg-neutral-950 p-4">
        <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Hitap
        </label>
        <div className="mt-2 flex gap-2">
          {["Bey", "Hanım"].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setHonorific(opt)}
              className={`flex-1 rounded-md border px-3 py-2 text-sm transition ${
                honorific === opt
                  ? "border-orange-500 bg-orange-500/10 text-orange-300"
                  : "border-neutral-800 text-neutral-400 hover:border-neutral-700"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </section>

      {/* Email template */}
      <section className="rounded-xl border border-neutral-900 bg-neutral-950 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Mail metni · {template.name}
          </h2>
          <button
            type="button"
            onClick={() => copyText("all")}
            className="rounded-md bg-orange-500 px-3 py-1.5 text-xs font-medium text-neutral-950 hover:bg-orange-400"
          >
            {copyState === "all" ? "✓ Kopyalandı" : "Hepsini kopyala"}
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs uppercase text-neutral-500">Konu</p>
              <button
                type="button"
                onClick={() => copyText("subject")}
                className="text-xs text-neutral-400 hover:text-neutral-100"
              >
                {copyState === "subject" ? "✓" : "Kopyala"}
              </button>
            </div>
            <div className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm">
              {renderedSubject}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs uppercase text-neutral-500">Body</p>
              <button
                type="button"
                onClick={() => copyText("body")}
                className="text-xs text-neutral-400 hover:text-neutral-100"
              >
                {copyState === "body" ? "✓" : "Kopyala"}
              </button>
            </div>
            <pre className="whitespace-pre-wrap rounded-md border border-neutral-800 bg-neutral-900 px-3 py-3 font-sans text-sm leading-relaxed">
              {renderedBody}
            </pre>
          </div>
        </div>
      </section>

      {/* CC reminder banner — STICKY */}
      <div className="sticky top-16 z-10 rounded-xl border border-orange-700 bg-orange-950/40 px-4 py-3 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-wider text-orange-300">
          ⚠️ CC zorunlu
        </p>
        <p className="mt-1 text-sm">
          Outlook&apos;tan gönderirken <code className="rounded bg-orange-900/50 px-1.5 py-0.5 font-mono">ozgurgur@gmail.com</code> adresini <strong>CC</strong>&apos;ye ekle.
        </p>
      </div>

      {/* Submit form */}
      {isSubmittable && (
        <section className="rounded-xl border border-neutral-900 bg-neutral-950 p-4 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Gönderim raporu
          </h2>

          <div>
            <label className="mb-1 block text-xs text-neutral-400">
              Ne zaman gönderdin?
            </label>
            <input
              type="datetime-local"
              value={sentAt}
              onChange={(e) => setSentAt(e.target.value)}
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-neutral-400">
              Template&apos;i değiştirdiysen özelleştirme notları (opsiyonel)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Müşterinin son IG postunu referans aldım..."
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
            />
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={channelConfirmed}
              onChange={(e) => setChannelConfirmed(e.target.checked)}
              className="mt-0.5 rounded border-neutral-700 bg-neutral-900"
            />
            <span>
              Outlook&apos;tan{" "}
              <strong className="text-orange-300">CC: ozgurgur@gmail.com</strong> ile gönderdiğimi onaylıyorum.
            </span>
          </label>

          {submitError && (
            <p className="rounded-md border border-red-900 bg-red-950/30 px-3 py-2 text-sm text-red-300">
              {submitError}
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!channelConfirmed || submitting}
            className="w-full rounded-md bg-emerald-500 px-4 py-3 text-sm font-semibold text-neutral-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Gönderiliyor..." : "✓ Gönderildi olarak işaretle"}
          </button>
        </section>
      )}

      {isSent && (
        <section className="rounded-xl border border-emerald-900 bg-emerald-950/20 p-4">
          <p className="text-sm font-medium text-emerald-300">✓ Bu görev gönderildi olarak işaretlendi.</p>
          <p className="mt-1 text-xs text-emerald-300/70">
            Admin&apos;in onayını bekliyor. Telegram&apos;dan haber alacaksın.
          </p>
        </section>
      )}
    </article>
  );
}
