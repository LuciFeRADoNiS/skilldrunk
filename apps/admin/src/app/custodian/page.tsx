import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/nav";
import { ChatPanel } from "@/components/custodian/ChatPanel";

export const dynamic = "force-dynamic";

export default async function CustodianPage() {
  const { profile } = await requireAdmin("/custodian");
  return (
    <>
      <div className="aurora" />
      <AdminNav userLabel={profile?.display_name ?? undefined} />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-4 sm:pt-6 pb-10">
        <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-500 mb-3">
          domain custodian
        </p>
        <ChatPanel
          chatEndpoint="/api/custodian/chat"
          actionEndpoint="/api/custodian/action"
          title="Domain Custodian — skilldrunk.com"
        />
      </main>
    </>
  );
}
