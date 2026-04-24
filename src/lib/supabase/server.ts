import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Shared auth across subdomains (e.g., analiz.skilldrunk.com).
// Set AUTH_COOKIE_DOMAIN=.skilldrunk.com in production env.
const AUTH_COOKIE_DOMAIN = process.env.AUTH_COOKIE_DOMAIN;

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
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
            // Called from a Server Component — middleware refreshes cookies.
          }
        },
      },
    }
  );
}
