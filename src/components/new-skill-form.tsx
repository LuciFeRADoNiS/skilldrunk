"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createSkill } from "@/app/actions/skills";
import { SKILL_TYPE_LABELS, type SkillType } from "@/lib/types";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function NewSkillForm() {
  const [state, formAction, pending] = useActionState(createSkill, undefined);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      <Field label="Title" hint="A clear, specific name.">
        <Input
          name="title"
          required
          minLength={2}
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="PDF form filler"
          disabled={pending}
        />
      </Field>

      <Field
        label="Slug"
        hint={`skilldrunk.com/s/${slug || "your-slug"}`}
      >
        <Input
          name="slug"
          required
          pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          disabled={pending}
        />
      </Field>

      <Field label="Type">
        <select
          name="type"
          required
          defaultValue="claude_skill"
          disabled={pending}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {(Object.keys(SKILL_TYPE_LABELS) as SkillType[]).map((k) => (
            <option key={k} value={k}>
              {SKILL_TYPE_LABELS[k]}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Summary"
        hint="One or two sentences. Shown in listings and search."
      >
        <Textarea
          name="summary"
          required
          minLength={10}
          maxLength={500}
          rows={2}
          placeholder="Fills PDF forms by mapping field names to a JSON payload..."
          disabled={pending}
        />
      </Field>

      <Field
        label="Body (Markdown)"
        hint="Full description, usage, examples. Markdown supported."
      >
        <Textarea
          name="body_mdx"
          required
          minLength={20}
          maxLength={50_000}
          rows={14}
          placeholder={`## What it does\n\n## How to use it\n\n## Example`}
          disabled={pending}
          className="font-mono text-sm"
        />
      </Field>

      <Field label="Tags" hint="Comma-separated, up to 10.">
        <Input
          name="tags"
          placeholder="pdf, forms, automation"
          disabled={pending}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Source URL" hint="GitHub repo, gist, etc.">
          <Input
            name="source_url"
            type="url"
            placeholder="https://github.com/you/repo"
            disabled={pending}
          />
        </Field>
        <Field label="Homepage URL" hint="Docs or landing page.">
          <Input
            name="homepage_url"
            type="url"
            placeholder="https://example.com"
            disabled={pending}
          />
        </Field>
      </div>

      <Field label="Install command" hint="How to install, if applicable.">
        <Input
          name="install_command"
          placeholder="npx @modelcontextprotocol/server-filesystem"
          disabled={pending}
        />
      </Field>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={pending} size="lg">
          {pending ? "Publishing..." : "Publish skill"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
