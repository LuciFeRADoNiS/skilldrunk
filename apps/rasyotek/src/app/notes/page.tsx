import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { adminClient } from "@/lib/context";
import { NotesClient } from "./client";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const { user } = await requireUser("/notes");
  const sb = adminClient();
  const { data: notes } = await sb
    .from("rt_notes")
    .select("id,note_type,title,body_md,meeting_date,related_doc_key,source,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/"
        className="mb-6 inline-block text-xs uppercase tracking-wider text-neutral-500 hover:text-neutral-300"
      >
        ← Paket
      </Link>
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Notlar</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Toplantı, gözlem, soru, karar, todo. Sonra brief'e dönüştürebilirsin.
          </p>
        </div>
        <span className="text-xs text-neutral-500">{notes?.length ?? 0} not</span>
      </header>
      <NotesClient initialNotes={notes ?? []} />
    </main>
  );
}
