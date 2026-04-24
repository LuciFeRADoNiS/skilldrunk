import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE_DOMAIN = process.env.AUTH_COOKIE_DOMAIN;

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
            const mergedOptions = AUTH_COOKIE_DOMAIN
              ? { ...options, domain: AUTH_COOKIE_DOMAIN }
              : options;
            response.cookies.set(name, value, mergedOptions);
          });
        },
      },
    }
  );

  // Touch auth so cookies refresh.
  await supabase.auth.getUser();

  return response;
}
