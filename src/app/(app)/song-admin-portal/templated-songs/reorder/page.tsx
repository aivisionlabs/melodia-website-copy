"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUp, ArrowDown, Loader2, Save, X, FileText, GripVertical } from "lucide-react";
import InlineAudioPlayer from "@/components/InlineAudioPlayer";

interface Category {
  id: number;
  name: string;
  slug: string;
  display_order?: number;
}

interface SongVariant {
  sourceAudioUrl?: string;
  audioUrl?: string;
}

interface TemplatedSong {
  id: number;
  title: string;
  slug: string;
  is_active: boolean;
  selected_variant: number | null;
  song_variants: SongVariant[] | Record<string, SongVariant> | null;
  template_lyrics: string | null;
  draft_lyrics: string | null;
  categories?: Array<{ id: number; name: string; slug: string; display_order: number }>;
}

interface LyricsModal {
  title: string;
  lyrics: string;
}

function getAudioUrl(song: TemplatedSong): string | null {
  if (!song.song_variants) return null;
  const idx = song.selected_variant ?? 0;
  const variant = Array.isArray(song.song_variants)
    ? song.song_variants[idx]
    : (song.song_variants as Record<string, SongVariant>)[String(idx)];
  return variant?.sourceAudioUrl ?? variant?.audioUrl ?? null;
}


export default function ReorderTemplatedSongsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allSongs, setAllSongs] = useState<TemplatedSong[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [orderedSongs, setOrderedSongs] = useState<TemplatedSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [lyricsModal, setLyricsModal] = useState<LyricsModal | null>(null);
  // Pointer-based drag-and-drop (works for both touch and mouse).
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const draggingIdRef = useRef<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Mirror of orderedSongs so pointer handlers always read the latest order
  // synchronously without stale closures.
  const orderRef = useRef<TemplatedSong[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [catRes, songRes] = await Promise.all([
          fetch("/api/admin/categories", { cache: "no-store" }),
          fetch("/api/admin/templated-songs", { cache: "no-store" }),
        ]);
        const catData = await catRes.json();
        const songData = await songRes.json();
        if (!catRes.ok) throw new Error(catData.error || "Failed to load categories");
        if (!songRes.ok) throw new Error(songData.error || "Failed to load songs");

        const cats: Category[] = catData.categories ?? [];
        const songs: TemplatedSong[] = songData.templatedSongs ?? [];

        const catsWithSongs = cats.filter((c) =>
          songs.some((s) => s.categories?.some((sc) => sc.id === c.id))
        );

        setCategories(catsWithSongs);
        setAllSongs(songs);

        if (catsWithSongs.length > 0) {
          setSelectedCategoryId(catsWithSongs[0].id);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (selectedCategoryId === null) return;
    const songsInCategory = allSongs.filter((s) =>
      s.categories?.some((c) => c.id === selectedCategoryId)
    );
    // Sort by category-specific display_order if available
    const sortedSongs = songsInCategory.sort((a, b) => {
      const aOrder = a.categories?.find((c) => c.id === selectedCategoryId)?.display_order ?? 0;
      const bOrder = b.categories?.find((c) => c.id === selectedCategoryId)?.display_order ?? 0;
      return aOrder - bOrder;
    });
    setOrderedSongs(sortedSongs);
    setSaved(false);
  }, [selectedCategoryId, allSongs]);

  // Keep the ref in sync so pointer handlers read the latest order.
  useEffect(() => {
    orderRef.current = orderedSongs;
  }, [orderedSongs]);

  const move = useCallback((index: number, direction: -1 | 1) => {
    setOrderedSongs((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSaved(false);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, id: number) => {
      // Ignore secondary mouse buttons; allow touch/pen/primary click.
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      draggingIdRef.current = id;
      setDraggingId(id);
    },
    []
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const id = draggingIdRef.current;
    if (id === null) return;
    e.preventDefault();
    const ul = listRef.current;
    if (!ul) return;

    // Find which row the pointer is currently over (by row midpoint).
    const rows = Array.from(
      ul.querySelectorAll<HTMLElement>("li[data-song-row]")
    );
    if (rows.length === 0) return;
    const y = e.clientY;
    let target = rows.length - 1;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) {
        target = i;
        break;
      }
    }

    const current = orderRef.current;
    const from = current.findIndex((s) => s.id === id);
    if (from === -1 || from === target) return;

    const next = [...current];
    const [moved] = next.splice(from, 1);
    const to = from < target ? target - 1 : target;
    next.splice(to, 0, moved);
    orderRef.current = next;
    setOrderedSongs(next);
    setSaved(false);
  }, []);

  const endDrag = useCallback((e: React.PointerEvent) => {
    if (draggingIdRef.current === null) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // pointer may already be released
    }
    draggingIdRef.current = null;
    setDraggingId(null);
  }, []);

  async function save() {
    if (selectedCategoryId === null || orderedSongs.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/templated-songs/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: selectedCategoryId,
          orderedSongIds: orderedSongs.map((s) => s.id),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      setSaved(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save order");
    } finally {
      setSaving(false);
    }
  }

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/song-admin-portal/templated-songs"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to songs
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reorder songs by category</h1>
        <p className="text-sm text-gray-500 mt-1">
          Set the display order of songs within each category. Drag the handle to
          reposition a song (or use the arrows), and preview with the player before
          repositioning it. Changes apply to the public API when filtering by category.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50 p-12 text-center">
          <p className="text-sm text-gray-500">
            No categories with assigned songs found. Assign songs to categories first.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
          {/* Category selector — dropdown on mobile, sidebar on sm+ */}
          <div className="sm:hidden">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              value={selectedCategoryId ?? ""}
              onChange={(e) => setSelectedCategoryId(Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none bg-white"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden sm:block w-56 flex-shrink-0">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categories
                </p>
              </div>
              <ul className="divide-y divide-gray-100">
                {categories.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setSelectedCategoryId(c.id)}
                      className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                        selectedCategoryId === c.id
                          ? "bg-yellow-50 text-yellow-700 font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Song order list */}
          <div className="flex-1 min-w-0">
            {selectedCategory && (
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-700">
                    {selectedCategory.name} — {orderedSongs.length} song
                    {orderedSongs.length !== 1 ? "s" : ""}
                  </p>
                  <button
                    onClick={save}
                    disabled={saving || orderedSongs.length === 0}
                    className="inline-flex items-center gap-1.5 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                  >
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    {saved ? "Saved!" : "Save order"}
                  </button>
                </div>

                {orderedSongs.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">
                    No songs in this category.
                  </div>
                ) : (
                  <ul ref={listRef} className="divide-y divide-gray-100">
                    {orderedSongs.map((song, i) => (
                      <li
                        key={song.id}
                        data-song-row
                        className={`px-3 py-3 sm:px-4 transition-shadow ${
                          draggingId === song.id
                            ? "relative z-10 bg-yellow-50 shadow-md ring-1 ring-inset ring-yellow-300"
                            : ""
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            onPointerDown={(e) => handlePointerDown(e, song.id)}
                            onPointerMove={handlePointerMove}
                            onPointerUp={endDrag}
                            onPointerCancel={endDrag}
                            className="flex items-center gap-1 flex-shrink-0 pt-0.5 cursor-grab active:cursor-grabbing touch-none select-none text-gray-300 hover:text-gray-500"
                            title="Drag to reorder"
                            role="button"
                            aria-label={`Drag to reorder ${song.title}`}
                          >
                            <GripVertical className="h-4 w-4" />
                            <span className="w-5 text-center text-xs font-mono text-gray-400">
                              {i + 1}
                            </span>
                          </span>

                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Title + move buttons */}
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`text-sm font-medium truncate ${
                                  song.is_active ? "text-gray-900" : "text-gray-400"
                                }`}
                                title={song.title}
                              >
                                {song.title}
                                {!song.is_active && (
                                  <span className="ml-1.5 text-xs font-normal text-gray-400">
                                    (inactive)
                                  </span>
                                )}
                              </span>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => move(i, -1)}
                                  disabled={i === 0}
                                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500"
                                  aria-label="Move up"
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => move(i, 1)}
                                  disabled={i === orderedSongs.length - 1}
                                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500"
                                  aria-label="Move down"
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            {/* Audio player + lyrics CTA */}
                            <div className="flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <InlineAudioPlayer
                                  audioUrl={getAudioUrl(song)}
                                  songTitle={song.title}
                                  songId={song.id}
                                  skipPlayTracking
                                />
                              </div>
                              {(song.template_lyrics ?? song.draft_lyrics) && (
                                <button
                                  onClick={() =>
                                    setLyricsModal({
                                      title: song.title,
                                      lyrics: (song.template_lyrics ?? song.draft_lyrics)!,
                                    })
                                  }
                                  className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-yellow-600 hover:text-yellow-700 font-medium"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  View lyrics
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {lyricsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setLyricsModal(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900 truncate pr-4">
                {lyricsModal.title}
              </h2>
              <button
                onClick={() => setLyricsModal(null)}
                className="flex-shrink-0 p-1 rounded hover:bg-gray-100 text-gray-500"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed">
                {lyricsModal.lyrics}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
