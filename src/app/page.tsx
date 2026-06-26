import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Root entry — private apex (D3, supersedes D-016).
 * No public landing. Logged-in → /home (the Mine; /home's requireAdmin bounces
 * non-admins). Guest → /login (the Cellar door).
 */
export const dynamic = "force-dynamic";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? "/home" : "/login");
}
