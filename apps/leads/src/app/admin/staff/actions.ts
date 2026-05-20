"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";

const createSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).max(200),
  phone: z.string().max(50).optional(),
  team: z.string().max(100).optional(),
});

export async function createStaff(formData: FormData) {
  const { supabase } = await requireAdmin();
  const parsed = createSchema.safeParse({
    email: (formData.get("email") as string)?.trim().toLowerCase(),
    full_name: formData.get("full_name"),
    phone: formData.get("phone") || undefined,
    team: formData.get("team") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Doğrulama hatası" };
  }
  const { error } = await supabase.from("sd_lead_staff").insert(parsed.data);
  if (error) return { error: error.message };
  revalidatePath("/admin/staff");
  return { success: true };
}

export async function toggleStaffActive(staffId: number, active: boolean) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("sd_lead_staff")
    .update({ active })
    .eq("id", staffId);
  if (error) return { error: error.message };
  revalidatePath("/admin/staff");
  return { success: true };
}
