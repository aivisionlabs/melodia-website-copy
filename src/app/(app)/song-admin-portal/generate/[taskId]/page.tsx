"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState, useCallback } from "react";
import DeleteSongButton from "@/components/DeleteSongButton";
import TimestampLyricsEditor from "@/components/TimestampLyricsEditor";
import {
  getSongByTaskIdAction,
  updateSongWithVariantsAction,
  getSongWithLyricsAction,
  autoStoreVariantsAction,
} from "@/lib/actions/song.actions";
import { useSunoTaskProgress, type SunoVariant } from "@/hooks/use-suno-task-progress";
import { Download, Check } from "lucide-react";
import type { LyricLine } from "@/types";
import { downloadFile } from "@/lib/utils/download-utils";

interface GenerateProgressPageProps {
  params: Promise<{
    taskId: string;
  }>;
}

export default function GenerateProgressPage({
  params,
}: GenerateProgressPageProps) {
  const { taskId } = use(params);
  const router = useRouter();
  const [lyrics, setLyrics] = useState<string>("");
  const [songInfo, setSongInfo] = useState<{
    id: number;
    title: string;
    slug: string;
  } | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [addToLibrary, setAddToLibrary] = useState(true);
  const [showLyrics, setShowLyrics] = useState(false);
  const [downloadAllowed, setDownloadAllowed] = useState(false);

  const [showLyricsEditor, setShowLyricsEditor] = useState(false);
  const [editorSongData, setEditorSongData] = useState<{
    timestampLyrics: LyricLine[] | null;
    plainLyrics: string | null;
  } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const onSuccess = useCallback(
    (variants: SunoVariant[]) => {
      autoStoreVariantsAction(taskId, variants).catch((err) => {
        console.error("Failed to auto-store variants:", err);
      });
    },
    [taskId]
  );

  const { error: generationError, progress, statusMessage, variants } =
    useSunoTaskProgress(taskId, { onSuccess });
  const displayError = saveError ?? generationError;

  useEffect(() => {
    let songInfoInterval: NodeJS.Timeout | null = null;

    const loadSong = async () => {
      try {
        const result = await getSongByTaskIdAction(taskId);
        if (result.success && result.song) {
          setSongInfo({
            id: result.song.id,
            title: result.song.title,
            slug: result.song.slug,
          });
          if (result.song.lyrics) {
            setLyrics(result.song.lyrics);
          }
          if (songInfoInterval) {
            clearInterval(songInfoInterval);
            songInfoInterval = null;
          }
        } else {
          console.warn("Song not found by taskId, will retry:", taskId);
        }
      } catch (err) {
        console.error("Error loading song info:", err);
      }
    };

    loadSong();
    songInfoInterval = setInterval(loadSong, 5000);

    return () => {
      if (songInfoInterval) clearInterval(songInfoInterval);
    };
  }, [taskId]);

  useEffect(() => {
    if (variants.length > 0 && variants[0].prompt) {
      setLyrics(variants[0].prompt);
    }
  }, [variants]);

  const handleVariantSelect = (variantIndex: number) => {
    setSelectedVariant(variantIndex);
  };

  const handleDownload = async (variant: SunoVariant, variantIndex: number) => {
    try {
      const audioUrl =
        variant.sourceAudioUrl || variant.audioUrl || variant.streamAudioUrl;
      if (!audioUrl) {
        console.error("No audio URL available for download");
        return;
      }

      const filename = `${variant.title || "variant"}_variant_${variantIndex + 1}.mp3`;
      await downloadFile(audioUrl, filename);
    } catch (err) {
      console.error("Error downloading audio:", err);
    }
  };

  const handleSaveSelection = async () => {
    if (selectedVariant === null) {
      setSaveError("Please select a variant first");
      return;
    }

    if (!songInfo) {
      setSaveError("Please select a variant first");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await updateSongWithVariantsAction(
        songInfo.id,
        variants,
        selectedVariant,
        addToLibrary,
        showLyrics,
        downloadAllowed,
      );

      if (result.success) {
        if (
          "timestampedLyricsGenerated" in result &&
          result.timestampedLyricsGenerated
        ) {
          console.log("Song saved with synchronized lyrics!");

          // Fetch song data for the modal
          const songDataResult = await getSongWithLyricsAction(songInfo.id);

          if (songDataResult.success && songDataResult.song) {
            setEditorSongData({
              timestampLyrics: songDataResult.song.timestamp_lyrics,
              plainLyrics: songDataResult.song.lyrics,
            });
            setShowLyricsEditor(true);
          } else {
            // If we can't fetch song data, just redirect
            router.push(`/song/${songInfo.slug}`);
          }
        } else if ("lyricsError" in result && result.lyricsError) {
          console.warn(
            "Song saved but lyrics generation failed:",
            result.lyricsError,
          );
          // Still redirect even if lyrics generation fails
          router.push(`/song/${songInfo.slug}`);
        } else {
          // No timestamped lyrics generated, redirect normally
          router.push(`/song/${songInfo.slug}`);
        }
      } else {
        setSaveError(result.error || "Failed to save selection");
      }
    } catch (err) {
      console.error("Error saving selection:", err);
      setSaveError("Failed to save selection");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditorSave = () => {
    setShowLyricsEditor(false);
    router.push(`/song/${songInfo?.slug}`);
  };

  const handleEditorCancel = () => {
    setShowLyricsEditor(false);
    router.push(`/song/${songInfo?.slug}`);
  };

  return (
    <>
      {showLyricsEditor && editorSongData && songInfo && (
        <TimestampLyricsEditor
          songId={songInfo.id}
          slug={songInfo.slug}
          timestampLyrics={editorSongData.timestampLyrics}
          plainLyrics={editorSongData.plainLyrics}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
        />
      )}

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Song Generation in Progress
              </h1>
              <p className="text-lg text-gray-600 mb-6">
                It will take 30-40 seconds to start song generation
              </p>
            </div>

            {displayError ? (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Generation Failed
                    </h3>
                    <div className="mt-2 text-sm text-red-700">{displayError}</div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Progress Bar */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Progress
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-yellow-600 h-3 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    {statusMessage}
                  </p>
                </div>

                {/* Variants Status */}
                {variants?.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Generated Variants
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {variants.map((variant, index) => (
                        <div
                          key={variant.id}
                          className={`border-2 rounded-lg p-4 transition-all duration-200 ${
                            selectedVariant === index
                              ? "border-yellow-500 bg-yellow-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">
                              Variant {index + 1}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Ready
                              </span>
                              {selectedVariant === index && (
                                <Check className="h-4 w-4 text-yellow-600" />
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            Duration:{" "}
                            {Math.round(Number(variant.duration) || 0)}s
                          </p>
                          {(variant.sourceAudioUrl ||
                            variant.audioUrl ||
                            variant.streamAudioUrl) && (
                            <audio controls className="w-full mb-3">
                              <source
                                src={
                                  variant.sourceAudioUrl ||
                                  variant.audioUrl ||
                                  variant.streamAudioUrl
                                }
                                type="audio/mpeg"
                              />
                              Your browser does not support the audio element.
                            </audio>
                          )}
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => handleVariantSelect(index)}
                              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                                selectedVariant === index
                                  ? "bg-yellow-600 text-white"
                                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                              }`}
                            >
                              {selectedVariant === index
                                ? "Selected"
                                : "Select"}
                            </button>
                            <button
                              onClick={() => handleDownload(variant, index)}
                              className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                              title="Download audio file"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Original Lyrics Display */}
                {lyrics && (
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Original Lyrics (Preview)
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                        {lyrics}
                      </pre>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Note: These are the original lyrics you entered.
                      Synchronized lyrics will be generated when you save your
                      selection.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Add to Library, Show Lyrics, and Show Download Checkboxes */}
            {variants.length > 0 && (
              <>
                <div className="flex flex-col sm:flex-row items-center justify-center mb-6 gap-3 sm:gap-6">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="addToLibrary"
                      checked={addToLibrary}
                      onChange={(e) => setAddToLibrary(e.target.checked)}
                      className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="addToLibrary"
                      className="ml-2 block text-sm text-gray-700"
                    >
                      Add to Library
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="showLyrics"
                      checked={showLyrics}
                      onChange={(e) => setShowLyrics(e.target.checked)}
                      className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="showLyrics"
                      className="ml-2 block text-sm text-gray-700"
                    >
                      Show Lyrics
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="downloadAllowed"
                      checked={downloadAllowed}
                      onChange={(e) => setDownloadAllowed(e.target.checked)}
                      className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="downloadAllowed"
                      className="ml-2 block text-sm text-gray-700"
                    >
                      Show Download
                    </label>
                  </div>
                </div>
                <p className="text-center text-sm text-gray-500 mb-6">
                  Add to Library: Makes the song visible in the public library.
                  Show Lyrics: Controls whether synchronized lyrics are
                  displayed. Show Download: Allows users to download this song
                  from the library page.
                </p>
              </>
            )}

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              {variants.length > 0 && (
                <button
                  onClick={handleSaveSelection}
                  disabled={selectedVariant === null || isSaving}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-colors w-full sm:w-auto ${
                    selectedVariant === null || isSaving
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                >
                  {isSaving
                    ? "Saving & Generating Lyrics..."
                    : "Save Selection"}
                </button>
              )}
              <button
                onClick={() => router.push("/song-admin-portal")}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md text-sm font-medium w-full sm:w-auto"
              >
                Back to Dashboard
              </button>
              {songInfo && (
                <DeleteSongButton
                  songId={songInfo.id}
                  songTitle={songInfo.title}
                  variant="icon"
                  onDelete={() => router.push("/song-admin-portal")}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
