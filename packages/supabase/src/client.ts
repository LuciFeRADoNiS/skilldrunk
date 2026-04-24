import { createBrowserClient as createSSRBrowserClient } from "@supabase/ssr";

/**
 * Subdomain-aware cookie domain.
 * Next.js only exposes vars prefixed with `NEXT_PUBLIC_` to the browser,
 * so we use a dedicated browser-visible var (mirrors AUTH_COOKIE_DOMAIN
 * on the server side).
 */
const AUTH_COOKIE_DOMAIN = process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN;

export function createBrowserClient() {
  return createSSRBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    AUTH_COOKIE_DOMAIN
      ? {
          cookieOptions: {
            domain: AUTH_COOKIE_DOMAIN,
          },
        }
      : undefined,
  );
}
