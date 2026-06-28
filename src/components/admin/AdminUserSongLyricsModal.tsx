"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  userSongId: number;
  songTitle: string;
  songStatus: string;
  onSaved?: () => void;
};

export default function AdminUserSongLyricsModal({
  open,
  onClose,
  userSongId,
  songTitle,
  songStatus,
  onSaved,
}: Props) {
  const [lyrics, setLyrics] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/user-songs/${userSongId}/lyrics`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load lyrics");
      }
      setLyrics(data.customerLyrics ?? "");
      setTitle(data.songTitle ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load lyrics");
    } finally {
      setLoading(false);
    }
  }, [userSongId]);

  useEffect(() => {
    if (open && userSongId) {
      void load();
    }
  }, [open, userSongId, load]);

  const handleSave = async () => {
    const trimmed = lyrics.trim();
    if (!trimmed) {
      setError("Lyrics cannot be empty");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/user-songs/${userSongId}/lyrics`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerLyrics: trimmed,
          ...(title.trim() ? { songTitle: title.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save lyrics");
      }
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save lyrics");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col"
        role="dialog"
        aria-labelledby="admin-edit-lyrics-title"
      >
        <div className="flex items-start justify-between gap-4 p-4 border-b border-gray-200">
          <div>
            <h2 id="admin-edit-lyrics-title" className="text-lg font-semibold text-gray-900">
              Edit lyrics (admin)
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {songTitle}
              <span className="text-gray-400"> · status: {songStatus}</span>
            </p>
            <p className="text-xs text-amber-700 mt-2 bg-amber-50 border border-amber-100 rounded px-2 py-1 inline-block">
              Saves to the draft used for Suno. Model-ready lyrics are cleared and rebuilt on the next
              generation / retry.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <p className="text-sm text-gray-500">Loading lyrics…</p>
          ) : (
            <>
              <label className="block text-xs font-medium text-gray-700">Song title (optional)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="Title sent to Suno"
              />
              <label className="block text-xs font-medium text-gray-700 mt-2">Customer lyrics</label>
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                rows={18}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono leading-relaxed"
                spellCheck={false}
              />
            </>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || saving}
            onClick={() => void handleSave()}
            className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save lyrics"}
          </button>
        </div>
      </div>
    </div>
  );
}
