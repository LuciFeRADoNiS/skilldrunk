"use client";

import { useEffect, useState } from "react";
import { Tracker } from "@skilldrunk/analytics/tracker";
import { createClient } from "@/lib/supabase/client";

export function TrackerWithAuth() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  return <Tracker userId={userId} />;
}
