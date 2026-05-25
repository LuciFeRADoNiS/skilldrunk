"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const BRIEF_TYPES = [
  {
    value: "meeting_outcome",
    label: "🗣 Toplantı Çıktısı",
    desc: "Son toplantıdan gözlemler + güncellenmiş risk skorları",
  },
  {
    value: "weekly",
    label: "📅 Haftalık",
    desc: "Son 7 günün özeti: notlar, kararlar, açık aksiyonlar",
  },
  {
    value: "adhoc",
    label: "⚡ Ad-hoc",
    desc: "Özel bir konu için anlık brief",
  },
];

export function BriefClient({ notesCount }: { notesCount: number }) {
  const router = useRouter();
  const [briefType, setBriefType] = useState("meeting_outcome");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [pushTelegram, setPushTelegram] = useState(false);

  async function generate() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brief_type: briefType,
          topic: topic.trim() || null,
          push_telegram: pushTelegram,
        }),
      });
      if (!res.ok) {
        alert("Hata: " + (await res.text()));
        return;
      }
      router.refresh();
      setTopic("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        {BRIEF_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setBriefType(t.value)}
            className={`rounded-md border px-3 py-3 text-left text-sm transition ${
              briefType === t.value
                ? "border-amber-700/40 bg-amber-950/30 text-amber-100"
                : "border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700"
            }`}
          >
            <div className="font-medium">{t.label}</div>
            <div className="mt-1 text-[11px] text-neutral-500">{t.desc}</div>
          </button>
        ))}
      </div>

      {briefType === "adhoc" && (
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Hangi konuda brief? (örn: 'Fuat'a 8 Haz'da soracaklarım')"
          className="mb-3 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
        />
      )}

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-neutral-400">
          <input
            type="checkbox"
            checked={pushTelegram}
            onChange={(e) => setPushTelegram(e.target.checked)}
            className="rounded"
          />
          Telegram'a push gönder
        </label>
        <button
          onClick={generate}
          disabled={loading || (briefType === "adhoc" && !topic.trim())}
          className="rounded-md bg-amber-700 px-5 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {loading ? "Üretiliyor..." : "Brief Üret"}
        </button>
      </div>

      <p className="mt-3 text-xs text-neutral-500">
        💡 Kullanılan kaynak: paket içeriği + {notesCount} not + son chat
        oturumların.
      </p>
    </div>
  );
}
