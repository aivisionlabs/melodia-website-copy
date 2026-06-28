"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminLyricsContextForm } from "@/components/admin/AdminLyricsContextForm";
import {
  useAdminGenerateLyricsPreview,
  type AdminGenerateLyricsPreviewPayload,
  type AdminGenerateLyricsPreviewResult,
} from "@/hooks/useAdminGenerateLyricsPreview";

interface PreviewResult {
  title: string | null;
  lyrics: string | null;
  musicStyle: string | null;
  description: string | null;
  language: string | null;
}

export default function AdminGenerateLyricsPage() {
  const { toast } = useToast();
  const [recipientDetails, setRecipientDetails] = useState("");
  const [occasion, setOccasion] = useState("");
  const [songStory, setSongStory] = useState("");
  const [mood, setMood] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["English"]);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { generateLyrics, isGenerating: submitting, error } =
    useAdminGenerateLyricsPreview({
      onSuccess: useCallback((data: AdminGenerateLyricsPreviewResult) => {
        setResult({
          title: data.title ?? null,
          lyrics: data.lyrics ?? null,
          musicStyle: data.musicStyle ?? null,
          description: data.description ?? null,
          language: data.language ?? null,
        });
        toast({
          title: "Lyrics and music style generated",
          description: "You can copy the results or use them in Create Song.",
        });
      }, [toast]),
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    const languagesStr =
      selectedLanguages.length > 0 ? selectedLanguages.join(", ") : "English";
    const payload: AdminGenerateLyricsPreviewPayload = {
      recipientDetails: recipientDetails.trim(),
      languages: languagesStr,
      occassion: occasion.trim() || undefined,
      songStory: songStory.trim() || undefined,
      mood: mood.trim()
        ? mood.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
    };
    generateLyrics(payload);
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast({
        title: "Copy failed",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/song-admin-portal"
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Generate Lyrics & Music Style
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Enter recipient and context to generate lyrics and music style (preview
          only; no song request or draft is created).
        </p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <AdminLyricsContextForm
              recipientDetails={recipientDetails}
              onRecipientDetailsChange={setRecipientDetails}
              occasion={occasion}
              onOccasionChange={setOccasion}
              songStory={songStory}
              onSongStoryChange={setSongStory}
              mood={mood}
              onMoodChange={setMood}
              languageMode="selector"
              selectedLanguages={selectedLanguages}
              onSelectedLanguagesChange={setSelectedLanguages}
              recipientRequired={true}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
              <Link
                href="/song-admin-portal"
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className={`py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 w-full sm:w-auto ${
                  submitting
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                    : "bg-yellow-600 hover:bg-yellow-700 text-white"
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  "Generate Lyrics & Music Style"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {result && (
        <div className="bg-white shadow sm:rounded-lg space-y-6">
          <div className="px-4 py-5 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Generated Result</h2>
            <p className="text-sm text-gray-500 mt-1">
              Copy and use in Create Song or elsewhere.
            </p>
          </div>

          <div className="px-4 pb-5 sm:px-6 sm:pb-6 space-y-4">
            {result.title && (
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Title
                  </label>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(result.title!, "title")}
                    className="inline-flex items-center text-sm text-yellow-600 hover:text-yellow-700"
                  >
                    {copiedField === "title" ? (
                      <Check className="h-4 w-4 mr-1" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    Copy
                  </button>
                </div>
                <p className="text-gray-900 font-medium">{result.title}</p>
              </div>
            )}

            {result.musicStyle != null && result.musicStyle !== "" && (
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Music Style
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(result.musicStyle!, "musicStyle")
                    }
                    className="inline-flex items-center text-sm text-yellow-600 hover:text-yellow-700"
                  >
                    {copiedField === "musicStyle" ? (
                      <Check className="h-4 w-4 mr-1" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    Copy
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={3}
                  value={result.musicStyle}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 sm:text-sm text-gray-900 px-3 py-2"
                />
              </div>
            )}

            {result.lyrics != null && result.lyrics !== "" && (
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Lyrics
                  </label>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(result.lyrics!, "lyrics")}
                    className="inline-flex items-center text-sm text-yellow-600 hover:text-yellow-700"
                  >
                    {copiedField === "lyrics" ? (
                      <Check className="h-4 w-4 mr-1" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    Copy
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={16}
                  value={result.lyrics}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 sm:text-sm text-gray-900 px-3 py-2 font-mono text-sm"
                />
              </div>
            )}

            <div className="pt-2">
              <Link
                href="/song-admin-portal/create"
                className="text-sm font-medium text-yellow-600 hover:text-yellow-700"
              >
                Create Song with these lyrics →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
