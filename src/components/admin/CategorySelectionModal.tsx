'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { LanguageSelector } from './LanguageSelector';

type Category = {
  id: number;
  name: string;
  slug: string;
  sequence: number;
  count: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (selectedCategories: string[], selectedLanguages: string[]) => void;
  availableCategories: Category[];
  selectedCategories: string[];
  selectedLanguages?: string[];
  songTitle?: string;
};

export default function CategorySelectionModal({
  open,
  onClose,
  onSave,
  availableCategories,
  selectedCategories: initialSelectedCategories,
  selectedLanguages: initialSelectedLanguages = [],
  songTitle,
}: Props) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialSelectedCategories);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(initialSelectedLanguages);
  const [query, setQuery] = useState('');

  // Update selected categories and languages when modal opens or initial values change
  useEffect(() => {
    if (open) {
      setSelectedCategories(initialSelectedCategories);
      setSelectedLanguages(initialSelectedLanguages);
      setQuery('');
    }
  }, [open, initialSelectedCategories, initialSelectedLanguages]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return availableCategories;
    return availableCategories.filter(cat =>
      cat.name.toLowerCase().includes(q) ||
      cat.slug.toLowerCase().includes(q)
    );
  }, [availableCategories, query]);

  const handleCategoryToggle = (categoryName: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryName)) {
        return prev.filter(name => name !== categoryName);
      } else {
        return [...prev, categoryName];
      }
    });
  };

  const handleSave = () => {
    onSave(selectedCategories, selectedLanguages);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-md shadow-lg w-full max-w-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Select Categories & Languages</h2>
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

        <div className="flex items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search categories..."
            className="border rounded px-3 py-2 flex-1"
          />
        </div>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Categories Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Categories</h3>
            <div className="border rounded">
              {availableCategories.length === 0 ? (
                <div className="text-center text-gray-500 py-6">
                  No categories available.
                </div>
              ) : (
                <div className="p-4 space-y-2 max-h-64 overflow-auto">
                  {filtered.map((category) => (
                    <label
                      key={category.id}
                      className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.name)}
                        onChange={() => handleCategoryToggle(category.name)}
                        className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-sm text-gray-700 flex-1">
                        {category.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({category.count} songs)
                      </span>
                    </label>
                  ))}
                  {filtered.length === 0 && (
                    <div className="text-center text-gray-500 py-6">
                      No categories found matching "{query}".
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Languages Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Languages</h3>
            <div className="border rounded p-4">
              <LanguageSelector
                selectedLanguages={selectedLanguages}
                onChange={setSelectedLanguages}
                label=""
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-600">
            {selectedCategories.length > 0 || selectedLanguages.length > 0 ? (
              <span>
                {selectedCategories.length} categor
                {selectedCategories.length === 1 ? 'y' : 'ies'}, {selectedLanguages.length} language
                {selectedLanguages.length === 1 ? '' : 's'} selected
              </span>
            ) : (
              <span className="text-gray-400">No selections made</span>
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
              className="px-4 py-2 rounded bg-yellow-600 text-white hover:bg-yellow-700"
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