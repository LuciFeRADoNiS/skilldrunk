"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@skilldrunk/supabase/server";
import { requireAdmin } from "@/lib/auth";

type Status = "idea" | "next" | "in_progress" | "blocked" | "done" | "wontfix";

const ALLOWED_STATUS: Status[] = [
  "idea",
  "next",
  "in_progress",
  "blocked",
  "done",
  "wontfix",
];

/** Add a new backlog item from the admin UI. */
export async function addBacklogAction(formData: FormData) {
  await requireAdmin("/backlog");

  const title = (formData.get("title") as string | null)?.trim();
  if (!title) return;

  const project =
    (formData.get("project") as string | null)?.trim() || "general";
  const priorityRaw = formData.get("priority") as string | null;
  const priority = Math.min(5, Math.max(1, Number(priorityRaw ?? 3) || 3));
  const tagsRaw = (formData.get("tags") as string | null)?.trim();
  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const supabase = await createServerClient();
  await supabase.rpc("sd_backlog_add", {
    p_title: title,
    p_project: project,
    p_priority: priority,
    p_source: "manual",
    p_status: "next",
    p_tags: tags,
  });

  revalidatePath("/backlog");
}

/** Change a row's status. */
export async function setStatusAction(formData: FormData) {
  await requireAdmin("/backlog");

  const id = Number(formData.get("id"));
  const status = formData.get("status") as Status;
  if (!Number.isFinite(id) || !ALLOWED_STATUS.includes(status)) return;

  const supabase = await createServerClient();
  await supabase.rpc("sd_backlog_set_status", { p_id: id, p_status: status });

  revalidatePath("/backlog");
}
