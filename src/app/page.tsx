import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublicHomePage } from "@/components/marketing/PublicHomePage";

/**
 * Root entry — D-016.
 * - Authenticated user → /home (owner shell)
 * - Guest → existing public marketplace landing (PublicHomePage component)
 *
 * NOTE: force-dynamic is required because we run auth.getUser() per request.
 * Faz 2.5 follow-up (D-025 candidate): keep ISR for guests by handling the
 * redirect in proxy.ts/middleware instead.
 */
export const dynamic = "force-dynamic";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/home");
  return <PublicHomePage />;
}
