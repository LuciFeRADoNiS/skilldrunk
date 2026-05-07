type Tone = "success" | "warn" | "danger" | "info" | "neutral" | "accent";

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  return <span className={`sd-badge sd-badge-${tone}`}>{children}</span>;
}
