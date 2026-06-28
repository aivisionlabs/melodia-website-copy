"use client";

import { X, Music } from "lucide-react";

interface MusicStyleModalProps {
  isOpen: boolean;
  onClose: () => void;
  musicStyle: string | null;
}

export default function MusicStyleModal({
  isOpen,
  onClose,
  musicStyle,
}: MusicStyleModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">Music Style</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {musicStyle ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 rounded-full p-2">
                  <Music className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Style</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {musicStyle}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Music className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No music style specified</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

