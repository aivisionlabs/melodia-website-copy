"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Music,
  Loader2,
  ArrowUpDown,
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import TemplatedSongUsageAnalytics from "@/components/admin/TemplatedSongUsageAnalytics";
import { TemplatedSongCategoryPromotionSelect } from "@/components/admin/TemplatedSongCategoryPromotionSelect";
import {
  adminSettingToPromotionFields,
  type TemplatedPromotionAdminSetting,
} from "@/lib/templated-songs/promotion-tag";

interface TemplatedSong {
  id: number;
  title: string;
  slug: string;
  template_lyrics: string | null;
  draft_lyrics: string | null;
  persona_id: number | null;
  music_style: string | null;
  display_order: number | null;
  is_active: boolean;
  suno_task_id: string | null;
  song_variants: unknown;
  selected_variant: number | null;
  created_at: string;
  updated_at: string;
  description: string | null;
  categories?: Array<{
    id: number;
    name: string;
    slug: string;
    display_order?: number;
    promotion_tag: string | null;
    suppress_auto_new: boolean;
  }>;
}

interface LyricsModal {
  title: string;
  lyrics: string;
}

const PAGE_SIZE = 20;

export default function AdminTemplatedSongsPage() {
  const [templates, setTemplates] = useState<TemplatedSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<Set<number>>(new Set());
  const [lyricsModal, setLyricsModal] = useState<LyricsModal | null>(null);
  const [page, setPage] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [categorySlug, setCategorySlug] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all",
  );
  const [readiness, setReadiness] = useState<
    "all" | "ready" | "needs_persona" | "generating" | "draft"
  >("all");

  function readinessOf(t: TemplatedSong) {
    if (t.template_lyrics) return t.persona_id ? "ready" : "needs_persona";
    if (t.suno_task_id) return "generating";
    return "draft";
  }

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of templates) {
      for (const c of t.categories ?? []) map.set(c.slug, c.name);
    }
    return Array.from(map, ([slug, name]) => ({ slug, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q) && !t.slug.toLowerCase().includes(q))
        return false;
      if (categorySlug !== "all" && !(t.categories ?? []).some((c) => c.slug === categorySlug))
        return false;
      if (statusFilter === "active" && !t.is_active) return false;
      if (statusFilter === "inactive" && t.is_active) return false;
      if (readiness !== "all" && readinessOf(t) !== readiness) return false;
      return true;
    });
  }, [templates, search, categorySlug, statusFilter, readiness]);

  const pageCount = Math.max(1, Math.ceil(filteredTemplates.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pagedTemplates = filteredTemplates.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  useEffect(() => {
    setPage(0);
  }, [search, categorySlug, statusFilter, readiness]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/admin/templated-songs", {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        setTemplates(data.templatedSongs ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  function handlePromotionSettingChange(
    templatedSongId: number,
    categoryId: number,
    setting: TemplatedPromotionAdminSetting,
  ) {
    const fields = adminSettingToPromotionFields(setting);
    setTemplates((prev) =>
      prev.map((template) => {
        if (template.id !== templatedSongId) return template;
        return {
          ...template,
          categories: template.categories?.map((category) =>
            category.id === categoryId
              ? {
                  ...category,
                  promotion_tag: fields.promotion_tag,
                  suppress_auto_new: fields.suppress_auto_new,
                }
              : category,
          ),
        };
      }),
    );
  }

  async function toggleActive(id: number, current: boolean) {
    setToggling((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/admin/templated-songs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !current }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_active: !current } : t))
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setToggling((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templated Songs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage template songs. Users can generate personalized
            songs from templates by entering a name.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/song-admin-portal/templated-songs/reorder"
            className="inline-flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-md text-sm font-medium transition-colors"
          >
            <ArrowUpDown className="h-4 w-4" />
            Reorder by category
          </Link>
          <Link
            href="/song-admin-portal/templated-songs/create"
            className="inline-flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2.5 rounded-md text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create template song
          </Link>
        </div>
      </div>

      <TemplatedSongUsageAnalytics />

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50 p-12 text-center">
          <Music className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-4 text-lg font-medium text-gray-900">
            No template songs yet
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Create a template song to let users generate personalized songs from
            a fixed lyrics template.
          </p>
          <Link
            href="/song-admin-portal/templated-songs/create"
            className="mt-6 inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2.5 rounded-md text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Create template song
          </Link>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or slug…"
              className="min-w-[12rem] flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
            />
            <select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
            >
              <option value="all">All categories</option>
              {categoryOptions.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={readiness}
              onChange={(e) =>
                setReadiness(
                  e.target.value as
                    | "all"
                    | "ready"
                    | "needs_persona"
                    | "generating"
                    | "draft",
                )
              }
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
            >
              <option value="all">All readiness</option>
              <option value="ready">Ready</option>
              <option value="needs_persona">Needs persona</option>
              <option value="generating">Generating</option>
              <option value="draft">Draft</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | "active" | "inactive")
              }
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">
              No templates match these filters.
            </div>
          ) : (
          <>
          {/* Mobile: card list */}
          <div className="sm:hidden space-y-3">
            {pagedTemplates.map((t) => (
              <div
                key={t.id}
                className={`rounded-lg border border-gray-200 bg-white p-4 space-y-3 ${
                  !t.is_active ? "opacity-60" : ""
                }`}
              >
                {/* Title row + toggle */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {t.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{t.slug}</p>
                  </div>
                  <button
                    onClick={() => toggleActive(t.id, t.is_active)}
                    disabled={toggling.has(t.id)}
                    className="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed mt-0.5"
                    style={{ backgroundColor: t.is_active ? "#ca8a04" : "#d1d5db" }}
                    aria-label={t.is_active ? "Disable" : "Enable"}
                  >
                    {toggling.has(t.id) ? (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-3 w-3 animate-spin text-white" />
                      </span>
                    ) : (
                      <span
                        className="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                        style={{ transform: t.is_active ? "translateX(16px)" : "translateX(0px)" }}
                      />
                    )}
                  </button>
                </div>

                {/* Status + categories */}
                <div className="flex flex-wrap items-center gap-2">
                  {t.template_lyrics ? (
                    t.persona_id ? (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Needs persona
                      </span>
                    )
                  ) : t.suno_task_id ? (
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      Generating
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      Draft
                    </span>
                  )}
                  {t.categories?.map((c) => (
                    <TemplatedSongCategoryPromotionSelect
                      key={c.id}
                      templatedSongId={t.id}
                      categoryId={c.id}
                      categoryName={c.name}
                      promotionTag={c.promotion_tag}
                      suppressAutoNew={c.suppress_auto_new}
                      onUpdated={handlePromotionSettingChange}
                    />
                  ))}
                </div>

                {/* Description */}
                {t.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{t.description}</p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-4 pt-1">
                  {(t.template_lyrics ?? t.draft_lyrics) && (
                    <button
                      onClick={() =>
                        setLyricsModal({
                          title: t.title,
                          lyrics: (t.template_lyrics ?? t.draft_lyrics)!,
                        })
                      }
                      className="inline-flex items-center gap-1.5 text-yellow-600 hover:text-yellow-700 font-medium text-sm"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      View lyrics
                    </button>
                  )}
                  <Link
                    href={`/song-admin-portal/templated-songs/${t.id}`}
                    className="inline-flex items-center gap-1 text-yellow-600 hover:text-yellow-700 font-medium text-sm ml-auto"
                  >
                    Edit →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block rounded-lg border border-gray-200 bg-white overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Slug
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lyrics
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categories & promotion
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagedTemplates.map((t) => (
                  <tr
                    key={t.id}
                    className={`bg-white hover:bg-gray-50 ${!t.is_active ? "opacity-60" : ""}`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {t.title}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{t.slug}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {t.template_lyrics ?? t.draft_lyrics ? (
                        <button
                          onClick={() =>
                            setLyricsModal({
                              title: t.title,
                              lyrics: (t.template_lyrics ?? t.draft_lyrics)!,
                            })
                          }
                          className="inline-flex items-center gap-1.5 text-yellow-600 hover:text-yellow-700 font-medium text-sm"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          View lyrics
                        </button>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {t.categories && t.categories.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {t.categories.map((c) => (
                            <TemplatedSongCategoryPromotionSelect
                              key={c.id}
                              templatedSongId={t.id}
                              categoryId={c.id}
                              categoryName={c.name}
                              promotionTag={c.promotion_tag}
                              suppressAutoNew={c.suppress_auto_new}
                              onUpdated={handlePromotionSettingChange}
                            />
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs">
                      {t.description ? (
                        <span className="line-clamp-2">{t.description}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {t.template_lyrics ? (
                        t.persona_id ? (
                          <span className="text-green-600">Ready</span>
                        ) : (
                          <span className="text-amber-600">Needs persona</span>
                        )
                      ) : t.suno_task_id ? (
                        <span className="text-blue-600">Generating / setup</span>
                      ) : (
                        <span className="text-gray-500">Draft</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => toggleActive(t.id, t.is_active)}
                        disabled={toggling.has(t.id)}
                        className="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: t.is_active ? "#ca8a04" : "#d1d5db",
                        }}
                        aria-label={t.is_active ? "Disable" : "Enable"}
                      >
                        {toggling.has(t.id) ? (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="h-3 w-3 animate-spin text-white" />
                          </span>
                        ) : (
                          <span
                            className="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                            style={{
                              transform: t.is_active
                                ? "translateX(16px)"
                                : "translateX(0px)",
                            }}
                          />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <Link
                        href={`/song-admin-portal/templated-songs/${t.id}`}
                        className="text-yellow-600 hover:text-yellow-700 font-medium"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
              <span>
                {safePage * PAGE_SIZE + 1}–
                {Math.min((safePage + 1) * PAGE_SIZE, filteredTemplates.length)} of{" "}
                {filteredTemplates.length.toLocaleString("en-IN")}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(0, safePage - 1))}
                  disabled={safePage === 0}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>
                <span className="tabular-nums text-gray-500">
                  {safePage + 1} / {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
                  disabled={safePage >= pageCount - 1}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          </>
          )}
        </>
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
