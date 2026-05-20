"use client";

import { useActionState } from "react";
import Link from "next/link";

type Template = {
  id?: number;
  name: string;
  step_num: number | null;
  subject: string;
  body_md: string;
  active: boolean;
};

type ActionResult = { error?: string } | undefined;
type Action = (formData: FormData) => Promise<ActionResult>;

export function TemplateForm({
  initial,
  action,
  submitLabel,
}: {
  initial: Partial<Template>;
  action: Action;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (_prev, formData) => action(formData),
    undefined,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="name" className="mb-1 block text-xs uppercase tracking-wider text-neutral-400">
            İsim
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={initial.name ?? ""}
            placeholder="ENCO Day 0 — Tanışma"
            className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="step_num" className="mb-1 block text-xs uppercase tracking-wider text-neutral-400">
            Step
          </label>
          <input
            id="step_num"
            name="step_num"
            type="number"
            min={0}
            max={99}
            defaultValue={initial.step_num ?? ""}
            placeholder="1"
            className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="subject" className="mb-1 block text-xs uppercase tracking-wider text-neutral-400">
          Konu
        </label>
        <input
          id="subject"
          name="subject"
          required
          defaultValue={initial.subject ?? ""}
          placeholder="{{first_name}} {{honorific}}, lojistik operasyonlarınız için..."
          className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="body_md" className="mb-1 block text-xs uppercase tracking-wider text-neutral-400">
          Mail metni
        </label>
        <textarea
          id="body_md"
          name="body_md"
          required
          rows={14}
          defaultValue={initial.body_md ?? ""}
          placeholder="Merhaba {{first_name}} {{honorific}}, ..."
          className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-sm focus:border-orange-500 focus:outline-none"
        />
        <p className="mt-1.5 text-xs text-neutral-500">
          Placeholder:{" "}
          <code className="text-orange-400">
            {"{{first_name}} {{last_name}} {{full_name}} {{title}} {{company}} {{city}} {{honorific}}"}
          </code>
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={initial.active ?? true}
          className="rounded border-neutral-700 bg-neutral-900"
        />
        Aktif (satışçı portal&apos;da görür)
      </label>

      {state?.error && (
        <p className="rounded-md border border-red-900 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-orange-400 disabled:opacity-50"
        >
          {pending ? "Kaydediliyor..." : submitLabel}
        </button>
        <Link
          href="/admin/templates"
          className="text-sm text-neutral-400 hover:text-neutral-100"
        >
          İptal
        </Link>
      </div>
    </form>
  );
}
