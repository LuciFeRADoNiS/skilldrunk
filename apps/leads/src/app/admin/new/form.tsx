"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { renderTemplate, buildContext } from "@/lib/template-render";

type Prospect = {
  id: number;
  name: string;
  company: string | null;
  title: string | null;
  city: string | null;
  email: string | null;
};
type Staff = { id: number; email: string; full_name: string | null; team: string | null };
type Template = {
  id: number;
  name: string;
  step_num: number | null;
  subject: string;
  body_md: string;
};

type State = { error?: string } | undefined;
type Action = (formData: FormData) => Promise<State>;

export function NewTaskForm({
  action,
  prospects,
  staff,
  templates,
}: {
  action: Action;
  prospects: Prospect[];
  staff: Staff[];
  templates: Template[];
}) {
  const [state, formAction, pending] = useActionState<State, FormData>(
    async (_prev, formData) => action(formData),
    undefined,
  );

  const [prospectId, setProspectId] = useState<string>(prospects[0]?.id?.toString() ?? "");
  const [templateId, setTemplateId] = useState<string>(templates[0]?.id?.toString() ?? "");
  const [honorific, setHonorific] = useState("Bey");

  const selectedProspect = useMemo(
    () => prospects.find((p) => p.id.toString() === prospectId) ?? null,
    [prospectId, prospects],
  );
  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id.toString() === templateId) ?? null,
    [templateId, templates],
  );

  const renderedSubject =
    selectedProspect && selectedTemplate
      ? renderTemplate(selectedTemplate.subject, buildContext(selectedProspect, honorific))
      : "";
  const renderedBody =
    selectedProspect && selectedTemplate
      ? renderTemplate(selectedTemplate.body_md, buildContext(selectedProspect, honorific))
      : "";

  const disabled = !prospects.length || !staff.length || !templates.length;

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="prospect_id" className="mb-1 block text-xs uppercase tracking-wider text-neutral-400">
            Müşteri (prospect)
          </label>
          <select
            id="prospect_id"
            name="prospect_id"
            required
            value={prospectId}
            onChange={(e) => setProspectId(e.target.value)}
            disabled={disabled}
            className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none disabled:opacity-50"
          >
            {prospects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.company ? ` — ${p.company}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="staff_id" className="mb-1 block text-xs uppercase tracking-wider text-neutral-400">
            Atanacak personel
          </label>
          <select
            id="staff_id"
            name="staff_id"
            required
            disabled={disabled}
            className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none disabled:opacity-50"
          >
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name ?? s.email}
                {s.team ? ` (${s.team})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="template_id" className="mb-1 block text-xs uppercase tracking-wider text-neutral-400">
            Email template
          </label>
          <select
            id="template_id"
            name="template_id"
            required
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            disabled={disabled}
            className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none disabled:opacity-50"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.step_num !== null ? `Step ${t.step_num} — ` : ""}
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="honorific" className="mb-1 block text-xs uppercase tracking-wider text-neutral-400">
            Hitap
          </label>
          <select
            id="honorific"
            name="honorific"
            value={honorific}
            onChange={(e) => setHonorific(e.target.value)}
            className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
          >
            <option value="Bey">Bey</option>
            <option value="Hanım">Hanım</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="due_at" className="mb-1 block text-xs uppercase tracking-wider text-neutral-400">
            Son tarih (opsiyonel)
          </label>
          <input
            id="due_at"
            name="due_at"
            type="datetime-local"
            className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="description" className="mb-1 block text-xs uppercase tracking-wider text-neutral-400">
            Açıklama (opsiyonel)
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            placeholder="Pilot batch 1 / öncelikli sektör vs."
            className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
          />
        </div>
      </div>

      {selectedProspect && selectedTemplate && (
        <div className="rounded-lg border border-neutral-900 bg-neutral-950 p-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-neutral-400">Önizleme</p>
          <p className="text-xs text-neutral-500">Konu</p>
          <p className="mb-3 rounded bg-neutral-900 px-2 py-1 font-mono text-xs">{renderedSubject}</p>
          <p className="text-xs text-neutral-500">Body</p>
          <pre className="whitespace-pre-wrap rounded bg-neutral-900 p-3 font-mono text-xs">{renderedBody}</pre>
        </div>
      )}

      {state?.error && (
        <p className="rounded-md border border-red-900 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || disabled}
          className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-orange-400 disabled:opacity-50"
        >
          {pending ? "Oluşturuluyor..." : "Görev oluştur"}
        </button>
        <Link href="/admin" className="text-sm text-neutral-400 hover:text-neutral-100">
          İptal
        </Link>
      </div>
    </form>
  );
}
