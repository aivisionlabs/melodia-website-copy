'use client';

import React, { useEffect, useMemo, useState } from 'react';

type PersonaItem = {
  id: number;
  sunoPersonaId: string;
  name: string;
  description: string;
  createdAt: string;
  audioUrl: string | null;
  referenceSongTitle: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (persona: { id: number; sunoPersonaId: string; name: string }) => void;
};

export default function PersonaSelectionModal({ open, onClose, onSelect }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PersonaItem[]>([]);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q) ||
      i.sunoPersonaId.toLowerCase().includes(q) ||
      (i.referenceSongTitle && i.referenceSongTitle.toLowerCase().includes(q))
    );
  }, [items, query]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/personas');
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to fetch personas');
        if (!cancelled) {
          setItems(
            (data.personas || []).map((p: any) => ({
              id: p.id,
              sunoPersonaId: p.sunoPersonaId,
              name: p.name,
              description: p.description,
              createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date(p.createdAt).toISOString(),
              audioUrl: p.audioUrl || null,
              referenceSongTitle: p.referenceSongTitle || null,
            }))
          );
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to fetch personas');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-md shadow-lg w-full max-w-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Select Persona</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">✕</button>
        </div>

        <div className="flex items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search personas..."
            className="border rounded px-3 py-2 flex-1"
          />
        </div>

        {loading && <div>Loading...</div>}
        {error && <div className="text-red-600">{error}</div>}

        {!loading && !error && (
          <div className="max-h-[60vh] overflow-auto border rounded">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left">Reference Song Title</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Preview</th>
                  <th className="px-3 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2">{p.referenceSongTitle || <span className="text-gray-400">N/A</span>}</td>
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2">
                      {p.audioUrl ? <audio controls src={p.audioUrl} className="w-64" /> : <span className="text-gray-400">No audio</span>}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                        onClick={() => onSelect({ id: p.id, sunoPersonaId: p.sunoPersonaId, name: p.name })}
                      >
                        Choose
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-500 py-6">
                      No personas found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button className="px-3 py-2 rounded border" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}


