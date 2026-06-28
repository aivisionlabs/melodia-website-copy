"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { use, useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  useSunoTaskProgress,
  type SunoVariant,
} from "@/hooks/use-suno-task-progress";
import { autoStoreTemplatedSongVariantsAction } from "@/lib/actions/song.actions";
import { Download, Check, ArrowLeft, Loader2 } from "lucide-react";
import { downloadFile } from "@/lib/utils/download-utils";

interface TemplateGeneratePageProps {
  params: Promise<{ id: string }>;
}

interface TemplateInfo {
  id: number;
  title: string;
  slug: string;
  suno_task_id: string | null;
  selected_variant: number | null;
  template_lyrics: string | null;
  draft_lyrics: string | null;
}

export default function TemplateGeneratePage({
  params,
}: TemplateGeneratePageProps) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskIdFromQuery = searchParams.get("taskId");

  const [template, setTemplate] = useState<TemplateInfo | null>(null);
  const [templateLoading, setTemplateLoading] = useState(true);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const taskId = taskIdFromQuery ?? template?.suno_task_id ?? null;

  const refetchTemplateRef = useRef<() => Promise<void>>(async () => {});

  const onPollingSuccess = useCallback(
    async (variants: SunoVariant[]) => {
      if (!taskId) return;
      const result = await autoStoreTemplatedSongVariantsAction(
        taskId,
        variants,
      );
      if (result.success) {
        await refetchTemplateRef.current();
      }
    },
    [taskId],
  );

  const { status, variants, error, progress, statusMessage } =
    useSunoTaskProgress(taskId, {
      onSuccess: onPollingSuccess,
    });

  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [processLyricsName, setProcessLyricsName] = useState("");
  const [titleInput, setTitleInput] = useState("");

  const refetchTemplate = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/admin/templated-songs/${id}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      const t = data.templatedSong;
      if (t) {
        setTemplate({
          id: t.id,
          title: t.title,
          slug: t.slug,
          suno_task_id: t.suno_task_id ?? null,
          selected_variant: t.selected_variant ?? null,
          template_lyrics: t.template_lyrics ?? null,
          draft_lyrics: t.draft_lyrics ?? null,
        });
        if (t.selected_variant !== undefined && t.selected_variant !== null) {
          setSelectedVariant(t.selected_variant);
        }
      }
    } catch (e: unknown) {
      console.error("Error refetching template:", e);
    }
  };
  refetchTemplateRef.current = refetchTemplate;

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setTemplateLoading(true);
        setTemplateError(null);
        const res = await fetch(`/api/admin/templated-songs/${id}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load template");
        const t = data.templatedSong;
        if (t) {
          setTemplate({
            id: t.id,
            title: t.title,
            slug: t.slug,
            suno_task_id: t.suno_task_id ?? null,
            selected_variant: t.selected_variant ?? null,
            template_lyrics: t.template_lyrics ?? null,
            draft_lyrics: t.draft_lyrics ?? null,
          });
          setTitleInput(t.title ?? "");
          if (t.selected_variant !== undefined && t.selected_variant !== null) {
            setSelectedVariant(t.selected_variant);
          }
        } else {
          setTemplateError("Template not found");
        }
      } catch (e: unknown) {
        setTemplateError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setTemplateLoading(false);
      }
    };
    load();
  }, [id]);

  const displayError = saveError ?? error;
  const nameToReplace = processLyricsName.trim();
  const trimmedTitle = titleInput.trim();

  const handleSaveSongVariants = async () => {
    if (selectedVariant === null || !template || !nameToReplace) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const patchBody: Record<string, unknown> = {
        selected_variant: selectedVariant,
        ...(variants.length > 0 && { song_variants: variants }),
      };
      if (titleInput.trim()) {
        patchBody.title = titleInput.trim();
      }
      const patchRes = await fetch(
        `/api/admin/templated-songs/${template.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchBody),
        },
      );
      const patchData = await patchRes.json();
      if (!patchRes.ok)
        throw new Error(patchData.error || "Failed to save variant");

      const processRes = await fetch(
        `/api/admin/templated-songs/${template.id}/process-lyrics`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nameToReplace }),
        },
      );
      const processData = await processRes.json();
      if (!processRes.ok) {
        throw new Error(processData.error || "Failed to process lyrics");
      }

      router.push("/song-admin-portal/templated-songs");
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save and process",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async (variant: SunoVariant, variantIndex: number) => {
    try {
      const audioUrl =
        variant.sourceAudioUrl || variant.audioUrl || variant.streamAudioUrl;
      if (!audioUrl) return;
      const filename = `${variant.title || "variant"}_variant_${variantIndex + 1}.mp3`;
      await downloadFile(audioUrl, filename);
    } catch (err) {
      console.error("Error downloading audio:", err);
    }
  };

  if (templateLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <p className="text-gray-600">Loading template...</p>
      </div>
    );
  }

  if (templateError || !template) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <Link
          href={`/song-admin-portal/templated-songs/${id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to template
        </Link>
        <p className="text-red-600">{templateError || "Template not found"}</p>
      </div>
    );
  }

  if (!taskId) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <Link
          href={`/song-admin-portal/templated-songs/${id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to template
        </Link>
        <p className="text-amber-700">
          No task ID available. Start generation from the template page or open
          this page after the template has a Suno task.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Template Song Generation in Progress
            </h1>
            <p className="text-sm text-gray-600 mb-2">
              Template: {template.title}
            </p>
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
                  <div className="mt-2 text-sm text-red-700">
                    {displayError}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
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
                  />
                </div>
                <p className="mt-2 text-sm text-gray-600">{statusMessage}</p>
              </div>

              {variants.length > 0 && (
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
                          Duration: {Math.round(Number(variant.duration) || 0)}s
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
                            onClick={() => setSelectedVariant(index)}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                              selectedVariant === index
                                ? "bg-yellow-600 text-white"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            {selectedVariant === index ? "Selected" : "Select"}
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
            </>
          )}

          {variants.length > 0 && (
            <div className="mt-8 space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label
                    htmlFor="song-title"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Song title
                  </label>
                  <p className="text-xs text-gray-500 mb-1.5 max-w-md">
                    The title for this template song (as entered by you, not AI-generated).
                  </p>
                  <input
                    id="song-title"
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="e.g. Birthday Song"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm w-64"
                  />
                </div>
                <div>
                  <label
                    htmlFor="name-to-replace"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Name in draft lyrics to replace with {"{{NAME}}"}
                  </label>
                  <p className="text-xs text-gray-500 mb-1.5 max-w-md">
                    Type the word exactly as it appears in your draft lyrics
                    (spelling and casing). This is the only place you enter it.
                  </p>
                  <input
                    id="name-to-replace"
                    type="text"
                    value={processLyricsName}
                    onChange={(e) => setProcessLyricsName(e.target.value)}
                    placeholder="e.g. Alex"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm w-48"
                  />
                </div>
                <button
                  onClick={handleSaveSongVariants}
                  disabled={
                    selectedVariant === null || !nameToReplace || !trimmedTitle || isSaving
                  }
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedVariant === null || !nameToReplace || !trimmedTitle || isSaving
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                >
                  {isSaving ? (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    "Save Song Variants"
                  )}
                </button>
              </div>
              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <Link
              href="/song-admin-portal/templated-songs"
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md text-sm font-medium"
            >
              Back to template list
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
