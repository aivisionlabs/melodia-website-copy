/**
 * Custom hook for managing lyrics versions
 */

import { useState, useEffect } from "react";

export interface LyricsVersionItem {
  id: number;
  version: number;
  originalVersionId: number | null;
  modelReadyLyrics: string | null;
  customerLyrics: string | null;
  songTitle: string | null;
  musicStyle: string | null;
  lyricsEditPrompt: string | null;
  status: string;
  language: string;
  createdAt: string;
  updatedAt: string;
}

interface UseLyricsVersionsOptions {
  songRequestId: number;
  enabled?: boolean;
}

export function useLyricsVersions({
  songRequestId,
  enabled = true,
}: UseLyricsVersionsOptions) {
  const [hasVersions, setHasVersions] = useState(false);
  const [versions, setVersions] = useState<LyricsVersionItem[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [activeVersionNumber, setActiveVersionNumber] = useState<number | null>(null);
  const [tabsRefreshKey, setTabsRefreshKey] = useState(0);

  const checkVersionsCount = async () => {
    if (!enabled) return;

    try {
      const response = await fetch(`/api/lyrics-versions/${songRequestId}`);
      if (response.ok) {
        const data = await response.json();
        const list = data.versions || [];
        setVersions(list);
        setHasVersions(list.length > 1);
        // Set selected version to latest if not set
        if (list.length > 0) {
          setSelectedVersionId((prev) => prev ?? list[0].id);
        }
      }
    } catch (error) {
      // Log but don't show error to user - not critical
      console.warn('Error checking versions count in useLyricsVersions', {
        error: error instanceof Error ? error.message : String(error),
        songRequestId,
      });
    }
  };

  const refreshTabs = () => {
    setTabsRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    if (enabled) {
      checkVersionsCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songRequestId, enabled]);

  useEffect(() => {
    if (enabled && tabsRefreshKey > 0) {
      checkVersionsCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabsRefreshKey]);

  return {
    hasVersions,
    versions,
    selectedVersionId,
    activeVersionNumber,
    tabsRefreshKey,
    setSelectedVersionId,
    setActiveVersionNumber,
    checkVersionsCount,
    refreshTabs,
  };
}
