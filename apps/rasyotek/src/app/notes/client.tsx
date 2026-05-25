"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRouter } from "next/navigation";

type Note = {
  id: string;
  note_type: string;
  title: string | null;
  body_md: string;
  meeting_date: string | null;
  related_doc_key: string | null;
  source: string | null;
  created_at: string;
};

const NOTE_TYPES = [
  { value: "meeting", label: "🗣 Toplantı" },
  { value: "observation", label: "👁 Gözlem" },
  { value: "question", label: "❓ Soru" },
  { value: "decision", label: "✓ Karar" },
  { value: "todo", label: "📋 TODO" },
];

export function NotesClient({ initialNotes }: { initialNotes: Note[] }) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [showForm, setShowForm] = useState(false);
  const [noteType, setNoteType] = useState("observation");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!body.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          note_type: noteType,
          title: title.trim() || null,
          body_md: body.trim(),
          meeting_date: meetingDate || null,
        }),
      });
      if (!res.ok) {
        alert("Hata: " + (await res.text()));
        return;
      }
      const { note } = await res.json();
      setNotes((n) => [note, ...n]);
      setTitle("");
      setBody("");
      setMeetingDate("");
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Bu notu silmek istediğine emin misin?")) return;
    const res = await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setNotes((n) => n.filter((x) => x.id !== id));
    }
  }

  return (
    <div>
      {/* New note button / form */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-6 w-full rounded-md border border-amber-700/40 bg-amber-950/20 px-4 py-3 text-left text-sm font-medium text-amber-200 hover:bg-amber-950/40"
        >
          + Yeni not yaz
        </button>
      )}

      {showForm && (
        <div className="mb-6 rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="mb-3 flex gap-2">
            {NOTE_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setNoteType(t.value)}
                className={`rounded-md px-3 py-1 text-xs transition ${
                  noteType === t.value
                    ? "bg-amber-700/40 text-amber-100"
                    : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {noteType === "meeting" && (
            <input
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="mb-2 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
            />
          )}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Başlık (opsiyonel)"
            className="mb-2 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Not içeriği (markdown destekli)..."
            rows={6}
            className="w-full resize-none rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm font-mono"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-200"
            >
              İptal
            </button>
            <button
              onClick={save}
              disabled={saving || !body.trim()}
              className="rounded-md bg-amber-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
      )}

      {/* Notes list */}
      <div className="space-y-3">
        {notes.length === 0 && (
          <p className="text-center text-sm text-neutral-500">
            Henüz not yok. Toplantıdan döndüğünde buraya dökebilirsin.
          </p>
        )}
        {notes.map((n) => (
          <div
            key={n.id}
            className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4"
          >
            <div className="mb-2 flex items-center gap-2 text-xs">
              <span className="rounded-md bg-neutral-800 px-2 py-0.5 text-neutral-300">
                {NOTE_TYPES.find((t) => t.value === n.note_type)?.label ?? n.note_type}
              </span>
              {n.meeting_date && (
                <span className="text-neutral-500">
                  {new Date(n.meeting_date).toLocaleDateString("tr-TR")}
                </span>
              )}
              <span className="text-neutral-500">
                · {new Date(n.created_at).toLocaleString("tr-TR")}
              </span>
              {n.source && (
                <span className="text-neutral-600">· {n.source}</span>
              )}
              <button
                onClick={() => remove(n.id)}
                className="ml-auto text-neutral-600 hover:text-rose-400"
                title="Sil"
              >
                ×
              </button>
            </div>
            {n.title && <h3 className="mb-1 font-medium">{n.title}</h3>}
            <div className="prose prose-invert prose-sm max-w-none prose-p:my-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{n.body_md}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
