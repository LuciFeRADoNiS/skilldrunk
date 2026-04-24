import { redirect } from "next/navigation";
import { createServerClient } from "@skilldrunk/supabase/server";

/**
 * Central login lives at skilldrunk.com/login. If user isn't authenticated
 * on analiz.skilldrunk.com, redirect to that central login with a next= param
 * pointing back to the current URL on this subdomain.
 */
export async function requireUser(currentPath: string = "/") {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const marketplaceUrl =
      process.env.NEXT_PUBLIC_MARKETPLACE_URL ?? "https://skilldrunk.com";
    const returnTo = `https://analiz.skilldrunk.com${currentPath}`;
    redirect(
      `${marketplaceUrl}/login?next=${encodeURIComponent(returnTo)}`
    );
  }

  return { supabase, user };
}
