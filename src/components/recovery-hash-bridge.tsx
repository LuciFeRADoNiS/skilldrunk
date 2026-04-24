"use client";

import { useEffect } from "react";

/**
 * If a Supabase password-recovery link lands on skilldrunk.com (instead of
 * the admin subdomain — e.g. when the allowlist hadn't been updated), forward
 * the hash fragment carrying the recovery token to admin.skilldrunk.com so
 * the user can actually reset their password.
 *
 * Runs only when `#type=recovery` is present; otherwise no-op (cheap).
 */
export function RecoveryHashBridge() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    // Supabase puts tokens after #, matched loosely
    if (!hash.includes("type=recovery")) return;
    const target = `https://admin.skilldrunk.com/reset-password/confirm${hash}`;
    window.location.replace(target);
  }, []);
  return null;
}
