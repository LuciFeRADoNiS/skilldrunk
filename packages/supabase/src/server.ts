import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cookie domain shared across subdomains (skilldrunk.com + analiz.skilldrunk.com + …).
 * Set via AUTH_COOKIE_DOMAIN env var. Leave unset in local dev (localhost).
 * Example prod value: `.skilldrunk.com`
 */
const AUTH_COOKIE_DOMAIN = process.env.AUTH_COOKIE_DOMAIN;

export async function createServerClient() {
  const cookieStore = await cookies();
  return createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const mergedOptions = AUTH_COOKIE_DOMAIN
                ? { ...options, domain: AUTH_COOKIE_DOMAIN }
                : options;
              cookieStore.set(name, value, mergedOptions);
            });
          } catch {
            // Server component write — ignore; middleware refreshes.
          }
        },
      },
    },
  );
}
