import type { SagkolUser } from "@sagkol/core";
import type { ProposalRow } from "./store";

/**
 * tÖdÜs rol-yetki matrisi (3 katman: prompt + canPropose + canConfirm).
 * admin = tam yetki. Diğer herkes (non-admin / anonim) = read-only.
 */

export function isAdmin(user: SagkolUser): boolean {
  return user.role === "admin";
}

/** Mutasyon ÖNEREBİLİR mi (propose_mutation tool'u). Layer 2. */
export function canPropose(user: SagkolUser): { ok: boolean; reason: string } {
  if (isAdmin(user)) return { ok: true, reason: "" };
  return {
    ok: false,
    reason:
      "Mutasyon önerme yetkisi yalnız admin'de. Sen read-only modundasın — sorgu, what-if simülasyonu ve board filtreleme yapabilirim ama kart değiştiremem.",
  };
}

/** Öneriyi ONAYLAYABİLİR mi (confirm endpoint). Layer 3 — yeniden doğrulanır. */
export function canConfirm(
  user: SagkolUser,
  _proposal: ProposalRow,
): { ok: boolean; reason: string } {
  if (isAdmin(user)) return { ok: true, reason: "" };
  return {
    ok: false,
    reason: `${user.name} admin değil — öneriyi onaylayamaz.`,
  };
}
