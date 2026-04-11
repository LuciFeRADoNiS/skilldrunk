"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const skillSchema = z.object({
  title: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Slug must be lowercase letters, numbers, and hyphens.",
    }),
  summary: z.string().min(10).max(500),
  type: z.enum([
    "claude_skill",
    "gpt",
    "mcp_server",
    "cursor_rule",
    "prompt",
    "agent",
  ]),
  body_mdx: z.string().min(20).max(50_000),
  tags: z.string().optional(),
  source_url: z.string().url().optional().or(z.literal("")),
  homepage_url: z.string().url().optional().or(z.literal("")),
  install_command: z.string().max(500).optional().or(z.literal("")),
});

export async function createSkill(
  _prev: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = skillSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    summary: formData.get("summary"),
    type: formData.get("type"),
    body_mdx: formData.get("body_mdx"),
    tags: formData.get("tags"),
    source_url: formData.get("source_url"),
    homepage_url: formData.get("homepage_url"),
    install_command: formData.get("install_command"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const tags = parsed.data.tags
    ? parsed.data.tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 10)
    : [];

  const { error } = await supabase.from("sd_skills").insert({
    author_id: user.id,
    title: parsed.data.title,
    slug: parsed.data.slug,
    summary: parsed.data.summary,
    type: parsed.data.type,
    body_mdx: parsed.data.body_mdx,
    tags,
    source_url: parsed.data.source_url || null,
    homepage_url: parsed.data.homepage_url || null,
    install_command: parsed.data.install_command || null,
    status: "published",
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "That slug is already taken. Pick another." };
    }
    console.error("create skill error", error);
    return { error: "Could not create skill. Try again." };
  }

  revalidatePath("/");
  redirect(`/s/${parsed.data.slug}`);
}
