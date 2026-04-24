import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/nav";
import { MarkAllButton } from "./actions-client";
import { markAllRead } from "@/app/actions/notifications";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  kind: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
};

const KIND_ICONS: Record<string, string> = {
  new_user: "👤",
  new_skill: "✨",
  new_report: "🚩",
};

function rel(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toISOString().split("T")[0];
}

function linkForNotif(n: Row): string | null {
  const meta = n.metadata ?? {};
  if (n.kind === "new_user" && meta.username) {
    return `https://skilldrunk.com/u/${meta.username}`;
  }
  if (n.kind === "new_skill" && meta.slug) {
    return `https://skilldrunk.com/s/${meta.slug}`;
  }
  if (n.kind === "new_report") {
    return `/reports`;
  }
  return null;
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const { supabase, profile } = await requireAdmin("/notifications");

  let q = supabase
    .from("sd_notifications")
    .select("id, kind, title, body, metadata, read, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (filter === "unread") q = q.eq("read", false);
  else if (filter === "read") q = q.eq("read", true);

  const { data } = await q.returns<Row[]>();
  const notifs = data ?? [];
  const unreadCount = notifs.filter((n) => !n.read).length;

  return (
    <>
      <AdminNav userLabel={profile?.display_name ?? undefined} />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Notifications</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Sistem event'leri: yeni kullanıcı, skill, report.
            </p>
          </div>
          <form
            action={async () => {
              "use server";
              await markAllRead();
            }}
          >
            <MarkAllButton disabled={unreadCount === 0} />
          </form>
        </div>

        <div className="mb-4 flex gap-2">
          {["all", "unread", "read"].map((f) => (
            <Link
              key={f}
              href={f === "all" ? "/notifications" : `/notifications?filter=${f}`}
              className={`rounded-md border px-3 py-1 text-xs capitalize ${
                (f === "all" && !filter) || f === filter
                  ? "border-orange-500 bg-orange-500/10 text-orange-400"
                  : "border-neutral-800 text-neutral-400 hover:bg-neutral-900"
              }`}
            >
              {f}
            </Link>
          ))}
        </div>

        {notifs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-900 p-12 text-center text-sm text-neutral-500">
            Bu filtrede bildirim yok.
          </div>
        ) : (
          <ul className="divide-y divide-neutral-900 rounded-lg border border-neutral-900 bg-neutral-950">
            {notifs.map((n) => {
              const href = linkForNotif(n);
              const inner = (
                <div className={`flex gap-3 px-4 py-3 ${!n.read ? "bg-orange-500/5" : ""}`}>
                  <span className="text-xl">{KIND_ICONS[n.kind] ?? "🔔"}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${!n.read ? "font-medium" : ""}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="mt-0.5 text-xs text-neutral-400 line-clamp-2">
                        {n.body}
                      </p>
                    )}
                    <p className="mt-1 font-mono text-[10px] text-neutral-600">
                      {rel(n.created_at)} · {n.kind}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                  )}
                </div>
              );
              return (
                <li key={n.id}>
                  {href ? (
                    <a
                      href={href}
                      target={href.startsWith("http") ? "_blank" : undefined}
                      rel="noreferrer"
                      className="block hover:bg-neutral-900"
                    >
                      {inner}
                    </a>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
