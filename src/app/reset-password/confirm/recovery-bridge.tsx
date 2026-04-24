"use client";

import { useEffect } from "react";

export function RecoveryBridge() {
  useEffect(() => {
    const hash = window.location.hash; // #access_token=...&type=recovery&...
    const target = `https://admin.skilldrunk.com/reset-password/confirm${hash}`;
    window.location.replace(target);
  }, []);
  return null;
}
