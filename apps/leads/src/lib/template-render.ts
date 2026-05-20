/**
 * Minimal mustache-style placeholder renderer.
 * Replaces {{key}} (and {{ key }}) with values from the context map.
 * Unknown keys collapse to empty string; the placeholder itself is left when
 * `strict` is true (so the admin can see what's missing).
 */
export function renderTemplate(
  template: string,
  context: Record<string, string | number | null | undefined>,
  opts: { strict?: boolean } = {},
): string {
  return template.replace(/\{\{\s*([a-z_][a-z0-9_]*)\s*\}\}/gi, (_, key: string) => {
    const v = context[key];
    if (v === undefined || v === null) return opts.strict ? `{{${key}}}` : "";
    return String(v);
  });
}

/**
 * Heuristic split of "Firstname Lastname" → { first_name, last_name }.
 * Falls back to the whole string as first_name for single-name leads.
 */
export function splitName(fullName: string | null | undefined): {
  first_name: string;
  last_name: string;
} {
  if (!fullName) return { first_name: "", last_name: "" };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

export type ProspectForTemplate = {
  name: string | null;
  title: string | null;
  company: string | null;
  city: string | null;
  email: string | null;
};

export function buildContext(
  prospect: ProspectForTemplate,
  honorific: string = "",
): Record<string, string> {
  const { first_name, last_name } = splitName(prospect.name);
  return {
    first_name,
    last_name,
    full_name: prospect.name ?? "",
    title: prospect.title ?? "",
    company: prospect.company ?? "",
    city: prospect.city ?? "",
    email: prospect.email ?? "",
    honorific,
  };
}
