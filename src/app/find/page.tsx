import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { FinderUI } from "./finder-ui";

export const metadata: Metadata = {
  title: "AI Skill Finder",
  description:
    "Describe what you're trying to build — we'll find the AI skills that fit. Powered by the skilldrunk community catalog.",
};

export default function FindPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-10 sm:py-16">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-mono text-orange-500">
            ✦ AI Skill Finder (beta)
          </div>
          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Ne yapmaya çalışıyorsun?
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-balance text-sm text-muted-foreground">
            Plain English ya da Türkçe — neye ihtiyacın olduğunu yaz, community
            catalog'dan en uygun skill'leri bulalım.
          </p>
        </div>

        <FinderUI />
      </main>
    </>
  );
}
