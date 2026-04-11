import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { NewSkillForm } from "@/components/new-skill-form";

export const metadata: Metadata = {
  title: "Submit a skill",
  description: "Publish a Claude Skill, GPT, MCP server, Cursor rule, or prompt to skilldrunk.",
};

export default async function NewSkillPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/new");
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            Submit a skill
          </h1>
          <p className="mt-2 text-muted-foreground">
            Share a skill with the community. Claude Skills, GPTs, MCP servers,
            Cursor rules, prompts, agents — all welcome.
          </p>
        </div>

        <NewSkillForm />
      </main>
    </>
  );
}
