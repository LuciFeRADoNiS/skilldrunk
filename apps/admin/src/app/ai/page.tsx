import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/nav";
import { AiChat } from "./chat";

export const dynamic = "force-dynamic";

export default async function AiPage() {
  const { profile } = await requireAdmin("/ai");

  return (
    <>
      <AdminNav userLabel={profile?.display_name ?? undefined} />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">AI Assistant</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Ekosistemini bilen asistan. Sorularını yanıtlar, link verir,
            yönlendirir. Sadece skilldrunk ekosistemine odaklanır.
          </p>
        </div>
        <AiChat />
      </main>
    </>
  );
}
