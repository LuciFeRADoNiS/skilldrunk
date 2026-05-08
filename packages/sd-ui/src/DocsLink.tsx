// Floating "Docs ↗" link — küçük apps için top-right fixed
export function DocsLink({ url = "https://skimsoulfat.com/docs" }: { url?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title="Kullanım Kılavuzu"
      style={{
        position: "fixed",
        top: 12,
        right: 16,
        zIndex: 50,
        padding: "5px 10px",
        fontFamily: "var(--sd-font-mono)",
        fontSize: 11,
        color: "var(--sd-text-2)",
        background: "var(--sd-surface)",
        border: "1px solid var(--sd-border)",
        borderRadius: "var(--sd-r)",
        textDecoration: "none",
        backdropFilter: "blur(8px)",
      }}
    >
      Docs ↗
    </a>
  );
}
