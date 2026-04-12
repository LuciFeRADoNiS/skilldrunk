"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/* ── Auth guard ── */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  const { data: profile } = await supabase
    .from("sd_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("not_authorized");
  return { supabase, user };
}

/* ── Dashboard stats ── */
export async function getAdminStats() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("sd_admin_stats");
  if (error) throw new Error(error.message);
  return data as {
    total_skills: number;
    total_users: number;
    total_votes: number;
    total_comments: number;
    total_arena_matches: number;
    open_reports: number;
    pageviews_today: number;
    pageviews_7d: number;
    searches_today: number;
    skills_by_type: Record<string, number> | null;
    signups_7d: { date: string; count: number }[] | null;
    top_searches: { query: string; count: number }[] | null;
  };
}

/* ── Skill management ── */
export type AdminSkillRow = {
  id: string;
  slug: string;
  title: string;
  type: string;
  status: string;
  score: number;
  comments_count: number;
  created_at: string;
  author: { username: string } | null;
};

export async function getAdminSkills(opts?: {
  status?: string;
  page?: number;
}) {
  const { supabase } = await requireAdmin();
  const page = opts?.page ?? 1;
  const perPage = 50;
  const from = (page - 1) * perPage;

  let query = supabase
    .from("sd_skills")
    .select(
      "id, slug, title, type, status, score, comments_count, created_at, sd_profiles!sd_skills_author_id_fkey(username)"
    )
    .order("created_at", { ascending: false })
    .range(from, from + perPage - 1);

  if (opts?.status) {
    query = query.eq("status", opts.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    type: row.type as string,
    status: row.status as string,
    score: row.score as number,
    comments_count: row.comments_count as number,
    created_at: row.created_at as string,
    author: row.sd_profiles as { username: string } | null,
  }));
}

export async function updateSkillStatus(
  skillId: string,
  status: "published" | "archived" | "draft"
) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("sd_skills")
    .update({ status })
    .eq("id", skillId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/skills");
  revalidatePath("/feed");
  return { ok: true };
}

/* ── User management ── */
export type AdminUserRow = {
  id: string;
  username: string;
  display_name: string | null;
  role: string;
  created_at: string;
};

export async function getAdminUsers() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("sd_profiles")
    .select("id, username, display_name, role, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminUserRow[];
}

export async function updateUserRole(
  userId: string,
  role: "user" | "moderator" | "admin"
) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("sd_profiles")
    .update({ role })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/users");
  return { ok: true };
}

/* ── Reports ── */
export type AdminReportRow = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reporter: { username: string } | null;
};

export async function getAdminReports(status?: string) {
  const { supabase } = await requireAdmin();
  let query = supabase
    .from("sd_reports")
    .select(
      "id, target_type, target_id, reason, details, status, created_at, sd_profiles!sd_reports_reporter_id_fkey(username)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    target_type: row.target_type as string,
    target_id: row.target_id as string,
    reason: row.reason as string,
    details: row.details as string | null,
    status: row.status as string,
    created_at: row.created_at as string,
    reporter: row.sd_profiles as { username: string } | null,
  }));
}

export async function updateReportStatus(
  reportId: string,
  status: "reviewed" | "actioned" | "dismissed"
) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("sd_reports")
    .update({ status })
    .eq("id", reportId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/reports");
  return { ok: true };
}
