"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/owner/auth";

export type Curation = "inbox" | "keep" | "watching" | "retired";

export interface CurationPatch {
  curation?: Curation;
  priority?: number;
  is_favorite?: boolean;
  notes_md?: string | null;
  personal_tags?: string[];
  dead_link?: boolean;
  last_reviewed_at?: string | null;
}

/**
 * Upsert the curator overlay (sd_library_meta) for a skill. Admin-only.
 * Resilient: if migration 0024 isn't applied yet, returns a friendly error
 * instead of throwing (the table simply doesn't exist on the branch's DB yet).
 */
export async function saveCuration(
  skillId: string,
  slug: string,
  patch: CurationPatch,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("sd_library_meta")
    .upsert({ skill_id: skillId, ...patch }, { onConflict: "skill_id" });

  if (error) {
    if (/does not exist|relation/i.test(error.message)) {
      return { ok: false, error: "Kütüphane katmanı henüz aktif değil (migration 0024 uygulanmadı)." };
    }
    return { ok: false, error: error.message };
  }
  revalidatePath(`/skills/${slug}`);
  revalidatePath("/skills");
  return { ok: true };
}

export async function markReviewed(skillId: string, slug: string) {
  return saveCuration(skillId, slug, { last_reviewed_at: new Date().toISOString() });
}
