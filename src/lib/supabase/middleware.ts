import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE_DOMAIN = process.env.AUTH_COOKIE_DOMAIN;

// Supabase chunks session cookies at ~3180 chars. A single value larger than
// this means an accumulated/oversized shared-domain cookie; the runtime can
// reject the resulting Set-Cookie at serialization and 504 the whole request.
// Skip such values instead — the marketplace reads public data anonymously.
const MAX_COOKIE_VALUE = 3600;

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            if (typeof value === "string" && value.length > MAX_COOKIE_VALUE) {
              return;
            }
            const mergedOptions = AUTH_COOKIE_DOMAIN
              ? { ...options, domain: AUTH_COOKIE_DOMAIN }
              : options;
            try {
              response.cookies.set(name, value, mergedOptions);
            } catch {
              // Ignore a cookie that can't be serialized rather than 504.
            }
          });
        },
      },
    }
  );

  try {
    await supabase.auth.getUser();
  } catch {
    // ignore
  }

  return response;
}
