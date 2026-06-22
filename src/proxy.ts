import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch {
    // Belt-and-suspenders: the real failure mode (oversized .skilldrunk.com auth
    // cookie) throws at response serialization, AFTER this returns, so this catch
    // alone is not enough — the actual fix is the cookie-size guard in
    // ./lib/supabase/middleware.ts.
    return NextResponse.next();
  }
}

export const config = {
  // Next.js 16 proxy always runs on the Node.js runtime, so no `runtime` field is
  // set here — Next rejects route segment config in a proxy file. Node's higher
  // header limits plus the cookie-size guard in ./lib/supabase/middleware.ts stop
  // the "TypeError: Headers.append: <value> is an invalid header value" that 504'd
  // every route for logged-in users carrying an oversized shared-domain cookie.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
