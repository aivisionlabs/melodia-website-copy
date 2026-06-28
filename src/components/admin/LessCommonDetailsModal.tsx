'use client';

import React, { useEffect, useState } from 'react';
import { FileText, Music, User } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  songId: number;
  songTitle: string;
  songType?: 'user_song' | 'song'; // Default to 'user_song' for backward compatibility
};

interface SongDetails {
  lyrics: string | null;
  musicStyle: string | null;
  persona: {
    id: number;
    name: string;
    description: string;
    variantIndex: number | null;
  } | null;
}

export default function LessCommonDetailsModal({
  open,
  onClose,
  songId,
  songTitle,
  songType = 'user_song',
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SongDetails | null>(null);

  useEffect(() => {
    if (open && songId) {
      fetchSongDetails();
    }
  }, [open, songId, songType]);

  const fetchSongDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = songType === 'song'
        ? `/api/admin/songs/${songId}/details`
        : `/api/admin/user-songs/${songId}/details`;
      const response = await fetch(endpoint);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch song details');
      }

      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Failed to load song details');
      }
    } catch (err) {
      console.error('Error fetching song details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load song details');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-md shadow-lg w-full max-w-4xl p-6 space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Less Common Details</h2>
            <p className="text-sm text-gray-500 mt-1">for {songTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black text-xl"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading song details...</div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto space-y-6">
            {/* Original Lyrics Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-600" />
                <h3 className="text-sm font-medium text-gray-900">Original Lyrics Supplied to Suno</h3>
              </div>
              {data?.lyrics ? (
                <div className="bg-gray-50 rounded-md p-3">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                    {data.lyrics}
                  </pre>
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  No lyrics found in Suno response
                </div>
              )}
            </div>

            {/* Music Style Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-gray-600" />
                <h3 className="text-sm font-medium text-gray-900">Music Style</h3>
              </div>
              {data?.musicStyle ? (
                <div className="bg-gray-50 rounded-md p-3">
                  <span className="text-sm text-gray-700">{data.musicStyle}</span>
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  No music style information available
                </div>
              )}
            </div>

            {/* Persona Info Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-600" />
                <h3 className="text-sm font-medium text-gray-900">Persona Information</h3>
              </div>
              {data?.persona ? (
                <div className="bg-gray-50 rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{data.persona.name}</span>
                    {data.persona.variantIndex !== null && (
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                        Variant {data.persona.variantIndex + 1}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{data.persona.description}</p>
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  No persona was used for this song
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}