/**
 * Email allowlist for the private apex. The ONLY people who may enter are the
 * emails listed here. Source: env `SD_ALLOWED_EMAILS` (comma-separated). If the
 * env is unset, the secure default is just the curator — so a missing env can
 * never accidentally open the door.
 *
 * To authorize someone: add their email to SD_ALLOWED_EMAILS in Vercel env
 * (admin + marketplace projects share the same value), then redeploy.
 *
 * This is the app-layer gate (auth/callback signs out non-allowed users;
 * requireAdmin bounces them). RLS (`sd_is_admin()`) is the independent DB-layer
 * gate — defense in depth.
 */
const DEFAULT_ALLOWED = ["ozgurgur@gmail.com"];

export function allowedEmails(): string[] {
  const raw = process.env.SD_ALLOWED_EMAILS;
  if (!raw || !raw.trim()) return DEFAULT_ALLOWED;
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email?: string | null): boolean {
  if (!email) return false;
  return allowedEmails().includes(email.toLowerCase());
}
