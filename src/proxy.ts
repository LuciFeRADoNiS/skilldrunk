import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch {
    // When the shared-domain auth cookie (.skilldrunk.com) is too large,
    // Headers.append throws a TypeError in the edge runtime.
    // Fall through without refreshing the session — the main site uses
    // createAnonClient() for public data so this is safe.
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
