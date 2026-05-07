type DotColor = "green" | "yellow" | "red" | "gray";

export function Dot({
  color = "gray",
  pulse,
}: {
  color?: DotColor;
  pulse?: boolean;
}) {
  return (
    <span className={`sd-dot sd-dot-${color}${pulse ? " sd-dot-pulse" : ""}`} />
  );
}
