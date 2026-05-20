"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase-admin";

const createSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).max(200),
  phone: z.string().max(50).optional(),
  team: z.string().max(100).optional(),
  send_invite: z.boolean().optional().default(true),
});

export async function createStaff(formData: FormData) {
  await requireAdmin();
  const parsed = createSchema.safeParse({
    email: (formData.get("email") as string)?.trim().toLowerCase(),
    full_name: formData.get("full_name"),
    phone: formData.get("phone") || undefined,
    team: formData.get("team") || undefined,
    send_invite: formData.get("send_invite") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Doğrulama hatası" };
  }
  const { send_invite, ...staffData } = parsed.data;

  const admin = createServiceRoleClient();

  // 1. Insert sd_lead_staff row (idempotent — if email exists, surface friendly error)
  const { data: existing } = await admin
    .from("sd_lead_staff")
    .select("id, user_id")
    .eq("email", staffData.email)
    .maybeSingle();

  let staffId: number;
  if (existing) {
    staffId = existing.id;
  } else {
    const { data: inserted, error } = await admin
      .from("sd_lead_staff")
      .insert(staffData)
      .select("id")
      .single();
    if (error || !inserted) return { error: error?.message ?? "INSERT başarısız" };
    staffId = inserted.id;
  }

  let inviteMessage = "Personel eklendi.";

  // 2. Provision auth user + send invite if requested
  if (send_invite) {
    const { data: invite, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      staffData.email,
      { redirectTo: "https://leads.skilldrunk.com/auth/callback" },
    );

    if (inviteError) {
      // "User already registered" → try to bind existing auth user
      const { data: userList } = await admin.auth.admin.listUsers();
      const existingUser = userList?.users.find(
        (u) => u.email?.toLowerCase() === staffData.email,
      );
      if (existingUser) {
        await admin
          .from("sd_lead_staff")
          .update({ user_id: existingUser.id })
          .eq("id", staffId)
          .is("user_id", null);
        inviteMessage = "Personel eklendi (auth user zaten kayıtlıydı, mevcut hesaba bağlandı).";
      } else {
        inviteMessage = `Personel eklendi ama davet gönderilemedi: ${inviteError.message}`;
      }
    } else if (invite?.user) {
      await admin
        .from("sd_lead_staff")
        .update({ user_id: invite.user.id })
        .eq("id", staffId);
      inviteMessage = "Personel eklendi, davet maili gönderildi.";
    }
  }

  revalidatePath("/admin/staff");
  return { success: true, message: inviteMessage };
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
