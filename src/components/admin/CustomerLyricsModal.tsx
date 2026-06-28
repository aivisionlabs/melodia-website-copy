'use client';

import React, { useEffect, useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (customerLyrics: string) => Promise<void>;
  songId: number;
  songTitle: string;
  initialCustomerLyrics?: string | null;
  loading?: boolean;
};

export default function CustomerLyricsModal({
  open,
  onClose,
  onSave,
  songId,
  songTitle,
  initialCustomerLyrics,
  loading: externalLoading = false,
}: Props) {
  const [customerLyrics, setCustomerLyrics] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load customer lyrics when modal opens
  useEffect(() => {
    if (open) {
      setCustomerLyrics(initialCustomerLyrics || '');
      setError(null);
      setIsLoading(false);
      setIsSaving(false);

      // If no initial lyrics provided, fetch from API
      if (initialCustomerLyrics === undefined) {
        setIsLoading(true);
        fetch(`/api/admin/songs/${songId}/customer-lyrics`)
          .then((res) => {
            if (!res.ok) {
              throw new Error('Failed to fetch customer lyrics');
            }
            return res.json();
          })
          .then((data) => {
            if (data.success) {
              setCustomerLyrics(data.customer_lyrics || '');
            } else {
              setError(data.error || 'Failed to load customer lyrics');
            }
          })
          .catch((err) => {
            console.error('Error fetching customer lyrics:', err);
            setError(err.message || 'Failed to load customer lyrics');
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    }
  }, [open, songId, initialCustomerLyrics]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await onSave(customerLyrics);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save customer lyrics');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setCustomerLyrics(initialCustomerLyrics || '');
    setError(null);
    onClose();
  };

  if (!open) return null;

  const isLoadingData = isLoading || externalLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-md shadow-lg w-full max-w-3xl p-6 space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Edit Customer Lyrics (Transliterated)</h2>
            <p className="text-sm text-gray-500 mt-1">for {songTitle}</p>
          </div>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="text-gray-500 hover:text-black text-xl disabled:opacity-50"
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

        {isLoadingData ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading customer lyrics...</div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto">
              <label htmlFor="customer-lyrics" className="block text-sm font-medium text-gray-700 mb-2">
                Transliterated Lyrics
              </label>
              <textarea
                id="customer-lyrics"
                value={customerLyrics}
                onChange={(e) => setCustomerLyrics(e.target.value)}
                placeholder="Enter transliterated lyrics here..."
                className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none resize-none font-mono text-sm"
                disabled={isSaving}
              />
              <p className="text-xs text-gray-500 mt-1">
                {customerLyrics.length} characters
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

