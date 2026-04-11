"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().email(),
  source: z.string().optional(),
});

export async function joinWaitlist(formData: FormData) {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    source: formData.get("source") ?? "landing",
  });

  if (!parsed.success) {
    return { ok: false, error: "Please enter a valid email." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("sd_waitlist")
      .insert({ email: parsed.data.email, source: parsed.data.source });

    if (error) {
      // Unique violation → treat as success (already on list).
      if (error.code === "23505") {
        return { ok: true, alreadyJoined: true };
      }
      console.error("waitlist insert failed", error);
      return { ok: false, error: "Something went wrong. Try again." };
    }

    return { ok: true };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Something went wrong. Try again." };
  }
}
