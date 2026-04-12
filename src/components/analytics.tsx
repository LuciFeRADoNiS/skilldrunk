"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function getSessionId() {
  if (typeof window === "undefined") return null;
  let sid = sessionStorage.getItem("sd-sid");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("sd-sid", sid);
  }
  return sid;
}

export function Analytics({ userId }: { userId?: string }) {
  const pathname = usePathname();
  const lastPath = useRef<string>("");

  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;

    // Fire-and-forget beacon
    const body = JSON.stringify({
      path: pathname,
      referrer: document.referrer || null,
      sid: getSessionId(),
      uid: userId ?? null,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", body);
    } else {
      fetch("/api/track", {
        method: "POST",
        body,
        keepalive: true,
        headers: { "Content-Type": "application/json" },
      }).catch(() => {});
    }
  }, [pathname, userId]);

  return null;
}
