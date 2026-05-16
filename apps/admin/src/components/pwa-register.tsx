"use client";

import { useEffect } from "react";

/**
 * Registers the service worker on mount.
 * Skips localhost and dev mode to avoid SW caching during development.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    if (window.location.hostname === "localhost") return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.warn("[pwa] sw register failed:", err));
    };

    // Defer until after first paint so we don't compete with critical work
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
