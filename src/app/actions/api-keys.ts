"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const createSchema = z.object({
  name: z.string().min(1).max(64),
  scopes: z.array(z.enum(["read", "write"])).min(1).default(["read"]),
});

export type CreateApiKeyResult =
  | { ok: true; key: string; prefix: string; name: string; id: string }
  | { ok: false; error: string };

export async function createApiKey(
  input: z.infer<typeof createSchema>
): Promise<CreateApiKeyResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Not authenticated." };

  const { data, error } = await supabase.rpc("sd_create_api_key", {
    p_name: parsed.data.name,
    p_scopes: parsed.data.scopes,
  });
  if (error) {
    console.error("sd_create_api_key rpc error", error);
    return { ok: false, error: error.message };
  }
  const row = (data?.[0] ?? null) as
    | { id: string; key: string; prefix: string; name: string }
    | null;
  if (!row) return { ok: false, error: "Key creation failed." };

  revalidatePath("/settings/api-keys");
  return { ok: true, key: row.key, prefix: row.prefix, name: row.name, id: row.id };
}

export async function revokeApiKey(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Not authenticated." };

  // RLS enforces user_id = auth.uid() on update.
  const { error } = await supabase
    .from("sd_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userData.user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/api-keys");
  return { ok: true };
}
