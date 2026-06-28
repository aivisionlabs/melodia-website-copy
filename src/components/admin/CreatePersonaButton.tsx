'use client';

import React, { useState } from 'react';

type Props = {
  sourceType: 'song' | 'user_song';
  sourceId: number;
  variantCount?: number;
  initialVariantIndex?: number;
  onCreated?: (persona: { id: number; sunoPersonaId: string; name: string; description: string; variantIndex?: number }) => void;
  className?: string;
  onPersonaExists?: (persona?: any) => void;
};

export default function CreatePersonaButton({ sourceType, sourceId, variantCount = 1, initialVariantIndex = 0, onCreated, className, onPersonaExists }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [variantIndex, setVariantIndex] = useState(initialVariantIndex);

  async function handleClick() {
    // Check if persona already exists before opening modal
    setChecking(true);
    setError(null);
    try {
      const queryParam = sourceType === 'song' ? `songId=${sourceId}` : `userSongId=${sourceId}`;
      const res = await fetch(`/api/admin/personas?${queryParam}`);
      const data = await res.json();

      if (res.ok && data.success && data.personas && data.personas.length > 0) {
        // Personas exist, notify but still allow opening the modal
        onPersonaExists?.(data.personas);
      }

      // Open the create modal
      setOpen(true);
    } catch (e: any) {
      console.error('Error checking persona:', e);
      // On error, still allow opening the modal
      setOpen(true);
    } finally {
      setChecking(false);
    }
  }

  async function handleCreate() {
    setLoading(true);
    setError(null);
    try {
      const body: any = {
        name,
        description,
        variantIndex,
      };
      if (sourceType === 'song') body.songId = sourceId;
      if (sourceType === 'user_song') body.userSongId = sourceId;

      const res = await fetch('/api/admin/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to create persona');
      }
      onCreated?.({
        id: data?.persona?.id,
        sunoPersonaId: data?.persona?.sunoPersonaId,
        name: data?.persona?.name,
        description: data?.persona?.description,
        variantIndex: data?.persona?.variantIndex,
      });
      setOpen(false);
      setName('');
      setDescription('');
    } catch (e: any) {
      setError(e?.message || 'Failed to create persona');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className={className || 'px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700'}
        onClick={handleClick}
        disabled={checking}
      >
        {checking ? 'Checking...' : 'Add as Voice Template'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-md shadow-lg w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add as Voice Template</h2>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-black">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Electronic Pop Singer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  rows={4}
                  placeholder="A modern electronic music style pop singer..."
                />
              </div>

              {variantCount > 1 && (
                <div>
                  <label className="block text-sm font-medium mb-1">Select Variant</label>
                  <select
                    value={variantIndex}
                    onChange={(e) => setVariantIndex(Number(e.target.value))}
                    className="w-full border rounded px-3 py-2"
                  >
                    {Array.from({ length: variantCount }).map((_, i) => (
                      <option key={i} value={i}>
                        Variant {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {error && <div className="text-sm text-red-600">{error}</div>}
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                className="px-3 py-2 rounded border"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
                onClick={handleCreate}
                disabled={loading || !name || !description}
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


