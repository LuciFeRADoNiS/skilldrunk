"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * First-party analytics — fires a POST to /api/track on every route change.
 * Session id persisted in sessionStorage for same-tab continuity.
 *
 * Mount this in the root layout of every skilldrunk subdomain app.
 * Each subdomain has its own /api/track route that writes to sd_pageviews
 * with the correct host field inferred from the incoming request.
 */
export function Tracker({ userId }: { userId?: string | null }) {
  const pathname = usePathname();
  const last = useRef<string>("");

  useEffect(() => {
    if (pathname === last.current) return;
    last.current = pathname;

    let sid: string | null = null;
    try {
      sid = sessionStorage.getItem("sd-sid");
      if (!sid) {
        sid = crypto.randomUUID();
        sessionStorage.setItem("sd-sid", sid);
      }
    } catch {}

    const body = JSON.stringify({
      path: pathname,
      referrer: document.referrer || null,
      sid,
      uid: userId ?? null,
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/track", blob);
    } else {
      fetch("/api/track", {
        method: "POST",
        body,
        keepalive: true,
        headers: { "content-type": "application/json" },
      }).catch(() => {});
    }
  }, [pathname, userId]);

  return null;
}
