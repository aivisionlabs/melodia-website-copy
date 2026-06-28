/**
 * Lyrics Version Tabs Component
 * Displays all lyrics versions in a tab-based UI with independent editing
 */

"use client";

import { Check, Music } from "lucide-react";
import { useEffect, useState } from "react";
import InteractiveLyrics from "@/components/lyrics/InteractiveLyrics";

interface PendingChange {
  id: string;
  original: string;
  instruction: string;
}

export interface LyricsVersion {
  id: number;
  version: number;
  originalVersionId: number | null;
  generatedText: string;
  customerLyrics: string | null;
  songTitle: string | null;
  musicStyle: string | null;
  lyricsEditPrompt: string | null;
  status: string;
  language: string;
  createdAt: string;
  updatedAt: string;
}

interface LyricsVersionTabsProps {
  songRequestId: number;
  onVersionSelect?: (versionId: number) => void;
  selectedVersionId?: number | null;
  onActiveVersionChange?: (versionId: number, versionNumber: number) => void;
  onAddChange?: (original: string, instruction: string) => void;
  pendingChanges?: PendingChange[];
}

export default function LyricsVersionTabs({
  songRequestId,
  onVersionSelect,
  selectedVersionId,
  onActiveVersionChange,
  onAddChange,
  pendingChanges,
}: LyricsVersionTabsProps) {
  const [versions, setVersions] = useState<LyricsVersion[]>([]);
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVersions();
  }, [songRequestId]);

  const fetchVersions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/lyrics-versions/${songRequestId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch versions");
      }

      setVersions(data.versions || []);

      // Set active tab to latest version (highest version number) or selected version
      if (data.versions && data.versions.length > 0) {
        const latestVersion = data.versions[0]; // Already sorted by version desc
        const initialTab = selectedVersionId
          ? data.versions.find((v: LyricsVersion) => v.id === selectedVersionId)
              ?.id || latestVersion.id
          : latestVersion.id;
        setActiveTab(initialTab);

        if (onActiveVersionChange) {
          const v = data.versions.find(
            (x: LyricsVersion) => x.id === initialTab,
          );
          if (v) onActiveVersionChange(v.id, v.version);
        }
      }
    } catch (err) {
      console.error("Error fetching versions:", err);
      setError(err instanceof Error ? err.message : "Failed to load versions");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (versionId: number) => {
    setActiveTab(versionId);
    const v = versions.find((x) => x.id === versionId);
    if (v) {
      if (onActiveVersionChange) onActiveVersionChange(v.id, v.version);
      if (onVersionSelect) onVersionSelect(versionId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-text-teal">Loading versions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error/10 border border-error rounded-lg p-4">
        <p className="text-error text-sm">{error}</p>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-8 text-text-teal/70">
        No versions found
      </div>
    );
  }

  const activeVersion = versions.find((v) => v.id === activeTab);

  return (
    <div className="space-y-4 min-w-0">
      {/* Tab Navigation - scroll horizontally when many versions */}
      <div className="border-b border-gray-200 overflow-x-auto overflow-y-hidden -mx-1 px-1">
        <nav className="flex space-x-2 min-w-max py-px" aria-label="Version Tabs">
          {versions.map((version) => {
            const isActive = activeTab === version.id;
            const isSelected = selectedVersionId === version.id;

            return (
              <button
                key={version.id}
                onClick={() => handleTabChange(version.id)}
                className={`
                  relative whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors
                  ${
                    isActive
                      ? "border-accent-coral text-accent-coral"
                      : "border-transparent text-text-teal/70 hover:text-text-teal hover:border-gray-300"
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <span>Version {version.version}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-accent-coral" />
                  )}
                </div>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-coral" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Version Content */}
      {activeVersion && (
        <div className="space-y-4">
          {/* Version Info */}
          <div className="text-sm text-text-teal/70">
            Created: {new Date(activeVersion.createdAt).toLocaleDateString()}
            {activeVersion.originalVersionId && (
              <span className="ml-2">
                (Derived from Version{" "}
                {versions.find(
                  (v) => v.id === activeVersion.originalVersionId,
                )?.version || "?"}
                )
              </span>
            )}
          </div>

          {/* Music Style (if available) */}
          {activeVersion.musicStyle && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-3 border border-purple-100">
              <div className="flex items-center gap-2 mb-1">
                <Music className="w-3.5 h-3.5 text-purple-600" />
                <span className="text-xs font-semibold text-purple-800">
                  Music Style
                </span>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">
                {activeVersion.musicStyle}
              </p>
            </div>
          )}

          {/* Lyrics Display/Edit - contain overflow and wrap long lines */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 min-w-0 overflow-x-auto">
            {onAddChange ? (
              <InteractiveLyrics 
                lyrics={activeVersion.customerLyrics || activeVersion.generatedText}
                onAddChange={onAddChange}
                pendingChanges={pendingChanges || []}
              />
            ) : (
              <div className="prose max-w-none min-w-0">
                <pre className="whitespace-pre-wrap break-words break-all text-sm text-text-teal font-sans">
                  {activeVersion.customerLyrics || activeVersion.generatedText}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
