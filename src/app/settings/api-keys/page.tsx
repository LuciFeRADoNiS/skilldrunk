import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ApiKeysClient } from "./api-keys-client";

export const metadata: Metadata = {
  title: "API keys — skilldrunk",
  description: "Manage programmatic access tokens for the skilldrunk API and MCP server.",
};

export const dynamic = "force-dynamic";

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
};

export default async function ApiKeysPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login?next=/settings/api-keys");

  const { data: keys } = await supabase
    .from("sd_api_keys")
    .select("id, name, prefix, scopes, last_used_at, created_at, revoked_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Back to skilldrunk
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">API keys</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create keys to access the{" "}
          <Link href="/docs/api" className="underline">
            skilldrunk REST API
          </Link>{" "}
          and the{" "}
          <Link href="/docs/mcp" className="underline">
            MCP server
          </Link>
          . Keys are shown once at creation — store them somewhere safe.
        </p>
      </div>

      <ApiKeysClient keys={(keys ?? []) as ApiKeyRow[]} />
    </main>
  );
}
