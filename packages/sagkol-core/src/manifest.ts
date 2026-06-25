/**
 * Sürüm manifesti — her projede `sagkol.version.json` olarak durur.
 * Filo güncellemesi (fleet upgrade) her repo'da hangi Core sürümünün olduğunu buradan bilir.
 */
export interface SagkolManifest {
  /** @sagkol/core sürümü, ör. "1.0.0". */
  core: string;
  /** Projenin adapter sürümü (domain katmanı). */
  adapter: string;
  /** Son uygulanma (ISO tarih). */
  appliedAt: string;
  /** Bu kurulumda açık yetenekler. */
  capabilities: string[];
  /** Projeye özel notlar / sapmalar. */
  notes?: string;
}

export const CORE_VERSION = "1.1.0";

/** İki semver'i kabaca karşılaştırır (a<b → -1, eşit → 0, a>b → 1). */
export function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

/** Bir projenin Core'u güncel mi? */
export function isUpToDate(manifest: SagkolManifest, latest = CORE_VERSION): boolean {
  return compareSemver(manifest.core, latest) >= 0;
}
