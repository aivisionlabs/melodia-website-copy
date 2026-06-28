'use client';

import React, { useEffect, useState } from 'react';
import { LanguageSelector } from './LanguageSelector';

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (selectedLanguages: string[]) => void;
  selectedLanguages: string[];
  songTitle?: string;
};

export default function LanguageModal({
  open,
  onClose,
  onSave,
  selectedLanguages: initialSelectedLanguages,
  songTitle,
}: Props) {
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(initialSelectedLanguages);

  // Update selected languages when modal opens or initial values change
  useEffect(() => {
    if (open) {
      setSelectedLanguages(initialSelectedLanguages);
    }
  }, [open, initialSelectedLanguages]);

  const handleSave = () => {
    onSave(selectedLanguages);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-md shadow-lg w-full max-w-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Select Languages</h2>
            {songTitle && (
              <p className="text-sm text-gray-500 mt-1">for {songTitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black text-xl"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="border rounded p-4">
            <LanguageSelector
              selectedLanguages={selectedLanguages}
              onChange={setSelectedLanguages}
              label=""
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-600">
            {selectedLanguages.length > 0 ? (
              <span>
                {selectedLanguages.length} language
                {selectedLanguages.length === 1 ? '' : 's'} selected
              </span>
            ) : (
              <span className="text-gray-400">No languages selected</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 rounded border hover:bg-gray-50"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
