"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, Loader2, Music2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InlineSongPlayer } from "@/components/create-song-request/InlineSongPlayer";
import {
  useAdminGenerateLyricsPreview,
  type AdminGenerateLyricsPreviewPayload,
  type AdminGenerateLyricsPreviewResult,
} from "@/hooks/useAdminGenerateLyricsPreview";
import {
  ALL_OCCASIONS,
  TEMPLATE_PAGE_SIZE,
} from "@/app/(app)/create/_components/create-page-constants";
import type { SongPreview } from "@/app/(app)/create/_components/create-page-types";

type TemplateSourceMode = "new" | "persona";

export default function AdminCreateTemplatedSongPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [draftLyrics, setDraftLyrics] = useState("");
  const [musicStyle, setMusicStyle] = useState("");
  const [language, setLanguage] = useState("English");
  const [occasion, setOccasion] = useState("Kids Birthday");
  const [description, setDescription] = useState("");
  const [allCategories, setAllCategories] = useState<
    Array<{ id: number; name: string; slug: string }>
  >([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<{
    id: number;
    sunoPersonaId: string;
    name: string;
  } | null>(null);
  const [templateSourceMode, setTemplateSourceMode] =
    useState<TemplateSourceMode>("new");
  /** When checked, the new template is created active and NameDrop-eligible immediately. */
  const [activateInstantly, setActivateInstantly] = useState(true);
  const [lyricsTab, setLyricsTab] = useState<"paste" | "generate">("paste");
  const [lyricsRefSourceSongId, setLyricsRefSourceSongId] = useState<
    number | null
  >(null);
  /** Lyrics of the selected library style (from admin song details) — read-only preview for admins */
  const [referenceSourceLyrics, setReferenceSourceLyrics] = useState<
    string | null
  >(null);
  const [styleTemplateSongs, setStyleTemplateSongs] = useState<SongPreview[]>(
    [],
  );
  const [styleTemplatesLoading, setStyleTemplatesLoading] = useState(false);
  const [styleTemplatesLoadingMore, setStyleTemplatesLoadingMore] =
    useState(false);
  const [styleTemplateHasMore, setStyleTemplateHasMore] = useState(false);
  const [styleTemplateNextOffset, setStyleTemplateNextOffset] = useState(0);
  const styleTemplatesSeq = useRef(0);
  const templateScrollRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/categories", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.categories?.length) setAllCategories(data.categories);
      })
      .catch(() => {});
  }, []);

  /** Drives /api/persona-templates; matches public /create category mapping */
  const effectiveOccasionForStyleTemplates = useMemo(
    () => (occasion.trim() || "Kids Birthday").trim(),
    [occasion],
  );

  const selectedStyleTemplateSong = useMemo(
    () =>
      lyricsRefSourceSongId == null
        ? null
        : (styleTemplateSongs.find((s) => s.id === lyricsRefSourceSongId) ??
          null),
    [lyricsRefSourceSongId, styleTemplateSongs],
  );

  const selectedStyleTemplateForPlayer = useMemo(
    () =>
      selectedStyleTemplateSong
        ? {
            ...selectedStyleTemplateSong,
            lyrics: referenceSourceLyrics,
          }
        : null,
    [referenceSourceLyrics, selectedStyleTemplateSong],
  );

  const clearStyleTemplateSong = useCallback(() => {
    setLyricsRefSourceSongId(null);
    setReferenceSourceLyrics(null);
    setSelectedPersona(null);
  }, []);

  const handleTemplateSourceModeChange = useCallback(
    (mode: TemplateSourceMode) => {
      setTemplateSourceMode(mode);
      setError(null);
      clearStyleTemplateSong();
    },
    [clearStyleTemplateSong],
  );

  const handleOccasionChange = useCallback(
    (value: string) => {
      setOccasion(value);
      if (templateSourceMode === "persona") {
        clearStyleTemplateSong();
      }
    },
    [clearStyleTemplateSong, templateSourceMode],
  );

  useEffect(() => {
    if (
      templateSourceMode !== "persona" ||
      !effectiveOccasionForStyleTemplates
    ) {
      return;
    }
    const seq = ++styleTemplatesSeq.current;
    setStyleTemplateSongs([]);
    setStyleTemplateNextOffset(0);
    setStyleTemplateHasMore(true);
    setStyleTemplatesLoading(true);
    const q = encodeURIComponent(effectiveOccasionForStyleTemplates);
    fetch(
      `/api/persona-templates?occasion=${q}&limit=${TEMPLATE_PAGE_SIZE}&offset=0`,
    )
      .then((r) => r.json())
      .then((j) => {
        if (styleTemplatesSeq.current !== seq) return;
        if (j?.success) {
          const songs: SongPreview[] = j.songs || [];
          setStyleTemplateSongs(songs);
          setStyleTemplateHasMore(!!j.hasMore);
          setStyleTemplateNextOffset(songs.length);
        } else {
          setStyleTemplateSongs([]);
          setStyleTemplateHasMore(false);
          setStyleTemplateNextOffset(0);
        }
      })
      .catch(() => {
        if (styleTemplatesSeq.current !== seq) return;
        setStyleTemplateSongs([]);
        setStyleTemplateHasMore(false);
        setStyleTemplateNextOffset(0);
      })
      .finally(() => {
        if (styleTemplatesSeq.current === seq) setStyleTemplatesLoading(false);
      });
  }, [templateSourceMode, effectiveOccasionForStyleTemplates]);

  const loadMoreStyleTemplates = useCallback(() => {
    if (
      !styleTemplateHasMore ||
      styleTemplatesLoading ||
      styleTemplatesLoadingMore ||
      templateSourceMode !== "persona"
    ) {
      return;
    }
    const offset = styleTemplateNextOffset;
    setStyleTemplatesLoadingMore(true);
    const seq = styleTemplatesSeq.current;
    const q = encodeURIComponent(effectiveOccasionForStyleTemplates);
    fetch(
      `/api/persona-templates?occasion=${q}&limit=${TEMPLATE_PAGE_SIZE}&offset=${offset}`,
    )
      .then((r) => r.json())
      .then((j) => {
        if (styleTemplatesSeq.current !== seq) return;
        if (!j?.success) {
          setStyleTemplateHasMore(false);
          return;
        }
        const batch: SongPreview[] = j.songs || [];
        setStyleTemplateSongs((prev) => {
          const seen = new Set(prev.map((s) => s.id));
          const added = batch.filter((s) => !seen.has(s.id));
          return added.length ? [...prev, ...added] : prev;
        });
        setStyleTemplateHasMore(!!j.hasMore);
        setStyleTemplateNextOffset((p) => p + batch.length);
      })
      .catch(() => {
        if (styleTemplatesSeq.current !== seq) return;
        setStyleTemplateHasMore(false);
      })
      .finally(() => {
        if (styleTemplatesSeq.current === seq)
          setStyleTemplatesLoadingMore(false);
      });
  }, [
    effectiveOccasionForStyleTemplates,
    styleTemplateHasMore,
    styleTemplateNextOffset,
    styleTemplatesLoading,
    styleTemplatesLoadingMore,
    templateSourceMode,
  ]);

  const selectStyleTemplateSong = useCallback(
    async (songId: number) => {
      setLyricsRefSourceSongId(songId);
      setReferenceSourceLyrics(null);
      try {
        const res = await fetch(`/api/admin/songs/${songId}/details`);
        const j = await res.json();
        if (!res.ok || !j.success) {
          throw new Error(j?.error || "Could not load song");
        }
        const rawLyrics = j.data?.lyrics;
        const hasLyrics =
          typeof rawLyrics === "string" && rawLyrics.trim().length > 0;
        setReferenceSourceLyrics(hasLyrics ? rawLyrics : null);
        const p = j.data?.persona;
        if (p?.id != null && p.sunoPersonaId != null) {
          setSelectedPersona({
            id: p.id,
            sunoPersonaId: String(p.sunoPersonaId),
            name: p.name,
          });
        } else {
          setSelectedPersona(null);
          toast({
            title: "No persona on this style",
            description:
              "We will still use this song to match lyrics structure. Pick another song with a linked persona, or use “Generate new template song” for a custom music style.",
          });
        }
      } catch (e) {
        setLyricsRefSourceSongId(null);
        setReferenceSourceLyrics(null);
        setSelectedPersona(null);
        toast({
          title: "Could not load style",
          description: e instanceof Error ? e.message : "Try again",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  const { generateLyrics, isGenerating: generatingLyrics } =
    useAdminGenerateLyricsPreview({
      onSuccess: useCallback(
        (result: AdminGenerateLyricsPreviewResult) => {
          if (result.lyrics != null) setDraftLyrics(result.lyrics);
          if (result.title != null) setTitle(result.title);
          if (result.musicStyle != null) setMusicStyle(result.musicStyle);
          toast({
            title: "Lyrics generated",
            description:
              "Draft lyrics are in the text area below. Edit and create the template when ready.",
          });
        },
        [toast],
      ),
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!description.trim()) {
      setError("Description of the song is required");
      return;
    }
    if (templateSourceMode === "persona" && !selectedPersona) {
      setError("Select a persona-based song first");
      return;
    }
    if (templateSourceMode === "new" && !musicStyle.trim()) {
      setError("Enter a music style for this template");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/templated-songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          draft_lyrics: draftLyrics.trim() || undefined,
          music_style:
            templateSourceMode === "persona"
              ? undefined
              : musicStyle.trim() || undefined,
          persona_id: selectedPersona?.id,
          language: language.trim() || "English",
          description: description.trim() || undefined,
          is_active: activateInstantly,
          is_namedrop_eligible: activateInstantly,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      const newId = data.templatedSong?.id;
      if (!newId) {
        router.push("/song-admin-portal/templated-songs");
        return;
      }
      // Save categories if any selected
      if (selectedCategoryIds.length > 0) {
        await fetch(`/api/admin/templated-songs/${newId}/categories`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryIds: selectedCategoryIds }),
        });
      }
      const hasLyrics = Boolean(draftLyrics?.trim());
      if (hasLyrics) {
        const createSongRes = await fetch(
          `/api/admin/templated-songs/${newId}/create-song`,
          { method: "POST" },
        );
        const createSongData = await createSongRes.json();
        if (createSongRes.ok && createSongData.taskId) {
          router.push(
            `/song-admin-portal/templated-songs/${newId}/generate?taskId=${createSongData.taskId}`,
          );
          return;
        }
      }
      router.push(`/song-admin-portal/templated-songs/${newId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateLyrics = () => {
    if (!title.trim() || !description.trim()) {
      toast({
        title: "Title and description required",
        description:
          "Fill in the template title and description at the top. They drive AI lyrics.",
        variant: "destructive",
      });
      return;
    }
    const contextLine = [title.trim(), description.trim()]
      .filter(Boolean)
      .join(" — ");
    const recipientForApi =
      contextLine.length >= 2 ? contextLine : "Song template";
    if (templateSourceMode === "persona" && !lyricsRefSourceSongId) {
      toast({
        title: "Select a persona song",
        description: "Choose a reference song before generating lyrics.",
        variant: "destructive",
      });
      return;
    }
    if (templateSourceMode === "persona" && !selectedPersona) {
      toast({
        title: "Persona missing",
        description: "Choose a persona-based song with a linked persona.",
        variant: "destructive",
      });
      return;
    }
    if (templateSourceMode === "persona" && !referenceSourceLyrics?.trim()) {
      toast({
        title: "Reference lyrics missing",
        description:
          "Choose a persona song with lyrics before generating from reference.",
        variant: "destructive",
      });
      return;
    }
    const payload: AdminGenerateLyricsPreviewPayload = {
      recipientDetails: recipientForApi,
      languages: language.trim() || "English",
      occassion:
        templateSourceMode === "persona"
          ? occasion.trim() || title.trim() || "Kids Birthday"
          : title.trim() || "General",
      songStory: description.trim() || undefined,
      sourceSongId:
        templateSourceMode === "persona"
          ? lyricsRefSourceSongId ?? undefined
          : undefined,
      personaId: selectedPersona ? selectedPersona.id : undefined,
    };
    generateLyrics(payload);
  };

  const handleCopyReferenceLyrics = useCallback(async () => {
    if (!referenceSourceLyrics?.trim()) {
      toast({
        title: "No lyrics to copy",
        description: "Select a persona song with lyrics first.",
        variant: "destructive",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(referenceSourceLyrics);
      toast({
        title: "Reference lyrics copied",
        description: "Use them as structure while drafting new lyrics.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Select and copy the lyrics manually.",
        variant: "destructive",
      });
    }
  }, [referenceSourceLyrics, toast]);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/song-admin-portal/templated-songs"
          className="text-gray-600 hover:text-gray-900 flex items-center gap-1 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Templated Songs
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">Create template song</h1>
      <p className="text-sm text-gray-500">
        Add a new template. If you include draft lyrics, you&apos;ll be taken
        straight to the generation page to produce the song via Suno. Otherwise
        you can add lyrics on the template page and start from there.
      </p>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Section 1: Template Info ── */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
            Template info
          </h2>

          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700"
            >
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Birthday Song for Alex"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none"
              required
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700"
            >
              Description of the song
            </label>
            <p className="text-xs text-gray-500 mt-0.5 mb-1">
              Shown on the template card, and sent to the AI as the song
              context when you generate lyrics.
            </p>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              required
              placeholder="Describe the song: tone, use case, what the listener should feel."
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="language"
              className="block text-sm font-medium text-gray-700"
            >
              Language
            </label>
            <input
              id="language"
              type="text"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="e.g. English, Hindi"
              className="mt-1 block w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none text-sm"
            />
          </div>

          {allCategories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categories
              </label>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {allCategories.map((cat) => (
                  <label
                    key={cat.id}
                    className="inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategoryIds.includes(cat.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategoryIds((prev) => [...prev, cat.id]);
                        } else {
                          setSelectedCategoryIds((prev) =>
                            prev.filter((x) => x !== cat.id),
                          );
                        }
                      }}
                      className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                    />
                    <span className="text-sm text-gray-800">{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-start gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={activateInstantly}
              onChange={(e) => setActivateInstantly(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
            />
            <span className="text-sm text-gray-800">
              Activate instantly &amp; mark NameDrop-eligible
              <span className="block text-xs text-gray-500">
                Creates the template as active and NameDrop-eligible right away.
                Uncheck to save it as an inactive draft.
              </span>
            </span>
          </label>
        </div>

        {/* ── Section 2: Lyrics & Song Generation ── */}
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                Template source
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleTemplateSourceModeChange("new")}
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${
                    templateSourceMode === "new"
                      ? "border-yellow-600 bg-yellow-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <span className="block text-sm font-semibold text-gray-900">
                    Generate new template song
                  </span>
                  <span className="mt-1 block text-xs text-gray-500">
                    Paste lyrics or generate fresh lyrics from admin context.
                    Enter a music style, then paste lyrics or use AI to draft them.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTemplateSourceModeChange("persona")}
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${
                    templateSourceMode === "persona"
                      ? "border-purple-600 bg-purple-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <span className="block text-sm font-semibold text-gray-900">
                    Select persona based song
                  </span>
                  <span className="mt-1 block text-xs text-gray-500">
                    Pick a library song, listen to it, copy its lyrics for
                    reference, and generate a new template with its persona.
                  </span>
                </button>
              </div>
            </div>

            {templateSourceMode === "new" && (
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setLyricsTab("paste")}
                    className={`flex-1 px-4 py-3 text-sm font-medium text-center transition-colors ${
                      lyricsTab === "paste"
                        ? "text-yellow-700 bg-yellow-50"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Paste lyrics
                  </button>
                  <button
                    type="button"
                    onClick={() => setLyricsTab("generate")}
                    className={`flex-1 px-4 py-3 text-sm font-medium text-center transition-colors ${
                      lyricsTab === "generate"
                        ? "text-purple-700 bg-purple-50"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Generate with AI
                  </button>
                </div>

                {lyricsTab === "paste" ? (
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="music_style_paste"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Music style
                      </label>
                      <input
                        id="music_style_paste"
                        type="text"
                        value={musicStyle}
                        onChange={(e) => setMusicStyle(e.target.value)}
                        placeholder="e.g. Pop Ballad"
                        className="block w-full rounded-md border border-gray-300 px-3 py-1.5 shadow-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Required for the template. Use &quot;Select persona
                        based song&quot; if the template should use a library
                        persona.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      AI uses the title, description, and language from
                      Template info above (no separate story or occasion fields
                      in this path).
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <button
                        type="button"
                        onClick={handleGenerateLyrics}
                        disabled={generatingLyrics}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 text-sm font-medium w-fit"
                      >
                        {generatingLyrics ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        Generate lyrics
                      </button>
                      <p className="text-xs text-gray-500">
                        Draft lyrics and a music style suggestion appear in the
                        text area below.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {templateSourceMode === "persona" && (
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div>
                  <label
                    htmlFor="admin-template-occasion"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Occasion
                  </label>
                  <select
                    id="admin-template-occasion"
                    value={
                      ALL_OCCASIONS.includes(occasion) ? occasion : "Kids Birthday"
                    }
                    onChange={(e) => handleOccasionChange(e.target.value)}
                    className="mt-1 block w-full max-w-md rounded-md border border-gray-300 px-3 py-2 shadow-sm text-sm text-gray-900 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none"
                  >
                    {ALL_OCCASIONS.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Persona template songs are filtered by this occasion (library
                    categories on /create). Title and description in Template
                    info are used when you generate from reference.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Persona song
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Pick a persona-based library song for the selected occasion
                    (below). The selected persona is saved on the final
                    template.
                  </p>
                  <div
                    ref={templateScrollRef}
                    className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x"
                  >
                    {styleTemplatesLoading &&
                      styleTemplateSongs.length === 0 &&
                      Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="min-w-[160px] flex-shrink-0 rounded-md border border-gray-200 bg-gray-50 p-3"
                        >
                          <div className="h-11 w-11 rounded bg-gray-200 mb-2" />
                          <div className="h-3 w-20 bg-gray-200 rounded" />
                        </div>
                      ))}
                    {!styleTemplatesLoading &&
                      styleTemplateSongs.length === 0 && (
                        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                          No persona songs found for {occasion}.
                        </div>
                      )}
                    {styleTemplateSongs.map((s) => {
                      const isSelected = lyricsRefSourceSongId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => selectStyleTemplateSong(s.id)}
                          className={`min-w-[170px] text-left flex-shrink-0 rounded-md border-2 p-3 transition-colors snap-start ${
                            isSelected
                              ? "border-purple-600 bg-purple-50"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="relative h-11 w-11 overflow-hidden rounded bg-gray-100 border border-gray-200 flex-shrink-0">
                              {s.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={s.imageUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <Music2 className="h-4 w-4 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-gray-900 truncate">
                                {s.title}
                              </p>
                              {isSelected ? (
                                <span className="text-[10px] font-medium text-purple-700">
                                  Selected
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-500">
                                  Select song
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {styleTemplateHasMore && !styleTemplatesLoading && (
                    <button
                      type="button"
                      onClick={loadMoreStyleTemplates}
                      disabled={styleTemplatesLoadingMore}
                      className="mt-2 text-sm text-purple-700 hover:underline disabled:opacity-50"
                    >
                      {styleTemplatesLoadingMore
                        ? "Loading..."
                        : "Load more songs"}
                    </button>
                  )}
                </div>

                {lyricsRefSourceSongId != null && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedPersona ? (
                        <div className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 pl-2.5 pr-1 py-1 text-sm text-gray-800">
                          <span className="font-medium">
                            {selectedPersona.name}
                          </span>
                          <button
                            type="button"
                            aria-label="Clear persona song"
                            onClick={clearStyleTemplateSong}
                            className="inline-flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:bg-red-100 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={clearStyleTemplateSong}
                          className="text-sm text-purple-700 hover:underline"
                        >
                          Clear persona song
                        </button>
                      )}
                    </div>

                    {selectedStyleTemplateForPlayer ? (
                      <InlineSongPlayer
                        key={selectedStyleTemplateForPlayer.id}
                        song={selectedStyleTemplateForPlayer}
                        onClose={clearStyleTemplateSong}
                      />
                    ) : null}

                    <div className="rounded-md border border-gray-200 bg-gray-50/80 p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1.5">
                        <label
                          className="text-sm font-medium text-gray-800"
                          htmlFor="ref_song_lyrics_preview"
                        >
                          Persona / reference song lyrics
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          {selectedStyleTemplateSong?.title ? (
                            <span className="text-xs text-gray-500 truncate max-w-[14rem]">
                              {selectedStyleTemplateSong.title}
                            </span>
                          ) : null}
                          <button
                            type="button"
                            onClick={handleCopyReferenceLyrics}
                            disabled={!referenceSourceLyrics?.trim()}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copy full lyrics
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        Use these full lyrics as the reference while manually
                        drafting below, or generate instantly from this
                        structure.
                      </p>
                      {referenceSourceLyrics?.trim() ? (
                        <textarea
                          id="ref_song_lyrics_preview"
                          readOnly
                          value={referenceSourceLyrics}
                          rows={10}
                          className="block w-full max-h-72 min-h-32 overflow-y-auto rounded border border-gray-200 bg-white px-3 py-2 font-mono text-xs text-gray-800"
                        />
                      ) : (
                        <p
                          className="text-sm text-amber-800/90 bg-amber-50 border border-amber-200/80 rounded-md px-3 py-2"
                          id="ref_song_lyrics_preview"
                        >
                          No lyrics in the database for this song. Choose
                          another persona song before generating from reference.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <button
                        type="button"
                        onClick={handleGenerateLyrics}
                        disabled={generatingLyrics}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 text-sm font-medium w-fit"
                      >
                        {generatingLyrics ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        Generate from reference
                      </button>
                      <p className="text-xs text-gray-500">
                        AI uses this song&apos;s lyrics structure and saves the
                        selected persona for final Suno generation.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Name placeholder + Lyrics textarea (shared) */}
            <div className="pt-3 border-t border-gray-100 space-y-3">
              <textarea
                id="draft_lyrics"
                value={draftLyrics}
                onChange={(e) => setDraftLyrics(e.target.value)}
                rows={14}
                placeholder={
                  lyricsTab === "paste"
                    ? "Paste your lyrics here...\n\n[Verse 1]\nHappy birthday to you, Alex..."
                    : "Generated lyrics will appear here. You can also edit them."
                }
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-md text-sm font-medium"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create template
          </button>
          <Link
            href="/song-admin-portal/templated-songs"
            className="inline-flex items-center px-4 py-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
