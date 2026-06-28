"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Music, X } from "lucide-react";
import { useToastHelpers } from "@/hooks/use-toast";
import { TAG_GROUPS, getRecommendedTags } from "@/lib/constants/song-tags";

interface CategoryOption {
  id: number;
  name: string;
  slug: string;
  sequence?: number;
  count?: number;
}

interface TemplatedSong {
  id: number;
  title: string;
  slug: string;
  template_lyrics: string | null;
  draft_lyrics: string | null;
  template_title: string | null;
  persona_id: number | null;
  music_style: string | null;
  display_order: number | null;
  is_active: boolean;
  suno_task_id: string | null;
  song_variants: unknown;
  selected_variant: number | null;
  created_at: string;
  updated_at: string;
  language: string | null;
  description: string | null;
  categories?: Array<{ id: number; name: string; slug: string }>;
  tags?: string[];
}

export default function AdminTemplatedSongDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [template, setTemplate] = useState<TemplatedSong | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingSong, setCreatingSong] = useState(false);
  const [allCategories, setAllCategories] = useState<CategoryOption[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [savingCategories, setSavingCategories] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [language, setLanguage] = useState("");
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [languageError, setLanguageError] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [savingDescription, setSavingDescription] = useState(false);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [savingTags, setSavingTags] = useState(false);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [tagSearch, setTagSearch] = useState("");
  const toast = useToastHelpers();

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [templateRes, categoriesRes] = await Promise.all([
          fetch(`/api/admin/templated-songs/${id}`, { cache: "no-store" }),
          fetch("/api/admin/categories", { cache: "no-store" }),
        ]);
        const templateData = await templateRes.json();
        const categoriesData = await categoriesRes.json();
        if (!templateRes.ok) throw new Error(templateData.error || "Failed to load");
        setTemplate(templateData.templatedSong ?? null);
        setTitle(templateData.templatedSong?.title ?? "");
        setLanguage(
          templateData.templatedSong?.language ?? "English",
        );
        setDescription(
          templateData.templatedSong?.description ?? "",
        );
        setSelectedTags(templateData.templatedSong?.tags ?? []);
        if (templateData.templatedSong?.categories) {
          setSelectedCategoryIds(
            templateData.templatedSong.categories.map((c: { id: number }) => c.id),
          );
        } else {
          setSelectedCategoryIds([]);
        }
        if (categoriesRes.ok && categoriesData.categories?.length) {
          setAllCategories(categoriesData.categories);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="space-y-4">
        <Link
          href="/song-admin-portal/templated-songs"
          className="text-gray-600 hover:text-gray-900 flex items-center gap-1 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Templated Songs
        </Link>
        <p className="text-red-600">{error || "Template not found"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/song-admin-portal/templated-songs"
          className="text-gray-600 hover:text-gray-900 flex items-center gap-1 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Templated Songs
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">{template.title}</h1>
      <p className="text-sm text-gray-500">Slug: {template.slug}</p>

      {/* Title */}
      <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Title</h2>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Template song title"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm w-80 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none"
          />
          <button
            type="button"
            disabled={savingTitle || !title.trim()}
            onClick={async () => {
              setSavingTitle(true);
              setTitleError(null);
              try {
                const res = await fetch(`/api/admin/templated-songs/${id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ title: title.trim() }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to update");
                setTemplate((prev) =>
                  prev ? { ...prev, title: title.trim() } : null,
                );
                toast.success("Title updated", "Template title has been updated successfully.");
              } catch (e: unknown) {
                setTitleError(e instanceof Error ? e.message : "Failed to update title");
              } finally {
                setSavingTitle(false);
              }
            }}
            className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-md text-sm font-medium"
          >
            {savingTitle ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Update title
          </button>
          {titleError && (
            <p className="text-sm text-red-600 w-full">{titleError}</p>
          )}
        </div>
      </div>

      {/* Language */}
      <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Language</h2>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="e.g. English, Hindi"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm w-48 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none"
          />
          <button
            type="button"
            disabled={savingLanguage}
            onClick={async () => {
              setSavingLanguage(true);
              setLanguageError(null);
              try {
                const res = await fetch(
                  `/api/admin/templated-songs/${id}`,
                  {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      language: language.trim() || null,
                    }),
                  },
                );
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to update");
                setTemplate((prev) =>
                  prev
                    ? { ...prev, language: language.trim() || null }
                    : null,
                );
                toast.success("Language updated", "Template language has been updated successfully.");
              } catch (e: unknown) {
                setLanguageError(
                  e instanceof Error ? e.message : "Failed to update language",
                );
              } finally {
                setSavingLanguage(false);
              }
            }}
            className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-md text-sm font-medium"
          >
            {savingLanguage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Update language
          </button>
          {languageError && (
            <p className="text-sm text-red-600 w-full">{languageError}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Description</h2>
        <p className="text-xs text-gray-500">
          Describes who this template is best suited for. Shown to users when picking a template.
        </p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="e.g. Perfect for celebrating a child's birthday with a fun, upbeat song"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none"
        />
        <button
          type="button"
          disabled={savingDescription}
          onClick={async () => {
            setSavingDescription(true);
            setDescriptionError(null);
            try {
              const res = await fetch(
                `/api/admin/templated-songs/${id}`,
                {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    description: description.trim() || null,
                  }),
                },
              );
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Failed to update");
              setTemplate((prev) =>
                prev
                  ? { ...prev, description: description.trim() || null }
                  : null,
              );
              toast.success("Description updated", "Template description has been updated successfully.");
            } catch (e: unknown) {
              setDescriptionError(
                e instanceof Error ? e.message : "Failed to update description",
              );
            } finally {
              setSavingDescription(false);
            }
          }}
          className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-md text-sm font-medium"
        >
          {savingDescription ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          Update description
        </button>
        {descriptionError && (
          <p className="text-sm text-red-600">{descriptionError}</p>
        )}
      </div>

      {/* Categories */}
      <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Categories</h2>
        <p className="text-xs text-gray-500">
          Link this template to categories. Consumers can filter templates by category.
        </p>
        {allCategories.length === 0 ? (
          <p className="text-sm text-gray-500">No categories defined. Create categories in the admin first.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              {allCategories.map((cat) => (
                <label
                  key={cat.id}
                  className="inline-flex items-center gap-2 cursor-pointer"
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
                  <span className="text-sm font-medium text-gray-800">
                    {cat.name}
                  </span>
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={savingCategories}
              onClick={async () => {
                setSavingCategories(true);
                setCategoriesError(null);
                try {
                  const res = await fetch(
                    `/api/admin/templated-songs/${id}/categories`,
                    {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        categoryIds: selectedCategoryIds,
                      }),
                    },
                  );
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Failed to save");
                  setTemplate((prev) =>
                    prev
                      ? {
                          ...prev,
                          categories: allCategories
                            .filter((c) => selectedCategoryIds.includes(c.id))
                            .map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
                        }
                      : null,
                  );
                  toast.success("Categories saved", "Template categories have been updated successfully.");
                } catch (e: unknown) {
                  setCategoriesError(
                    e instanceof Error ? e.message : "Failed to save categories",
                  );
                } finally {
                  setSavingCategories(false);
                }
              }}
              className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-md text-sm font-medium"
            >
              {savingCategories ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Save categories
            </button>
            {categoriesError && (
              <p className="text-sm text-red-600">{categoriesError}</p>
            )}
          </>
        )}
      </div>

      {/* Tags */}
      <TagsSection
        template={template}
        selectedTags={selectedTags}
        setSelectedTags={setSelectedTags}
        savingTags={savingTags}
        setSavingTags={setSavingTags}
        tagsError={tagsError}
        setTagsError={setTagsError}
        tagSearch={tagSearch}
        setTagSearch={setTagSearch}
        id={id}
        toast={toast}
        setTemplate={setTemplate}
      />

      {!template.suno_task_id && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={
              creatingSong ||
              !(
                template.draft_lyrics?.trim() ||
                template.template_lyrics?.trim()
              )
            }
            onClick={async () => {
              setCreatingSong(true);
              setError(null);
              try {
                const res = await fetch(
                  `/api/admin/templated-songs/${id}/create-song`,
                  { method: "POST" },
                );
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to start");
                if (data.taskId) {
                  router.push(
                    `/song-admin-portal/templated-songs/${id}/generate?taskId=${data.taskId}`,
                  );
                  return;
                }
                throw new Error("No taskId returned");
              } catch (e: unknown) {
                setError(
                  e instanceof Error ? e.message : "Failed to create song",
                );
              } finally {
                setCreatingSong(false);
              }
            }}
            className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            {creatingSong ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Music className="h-4 w-4" />
            )}
            Create Song (generate both variants via Suno)
          </button>
        </div>
      )}

      {template.suno_task_id && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          {template.song_variants != null
            ? "Continue setup: select variant, set persona, and process lyrics on the setup page."
            : "Song is generating."}{" "}
          <Link
            href={`/song-admin-portal/templated-songs/${id}/generate`}
            className="font-medium underline"
          >
            Open setup page
          </Link>
        </p>
      )}
    </div>
  );
}

interface TagsSectionProps {
  template: TemplatedSong;
  selectedTags: string[];
  setSelectedTags: React.Dispatch<React.SetStateAction<string[]>>;
  savingTags: boolean;
  setSavingTags: React.Dispatch<React.SetStateAction<boolean>>;
  tagsError: string | null;
  setTagsError: React.Dispatch<React.SetStateAction<string | null>>;
  tagSearch: string;
  setTagSearch: React.Dispatch<React.SetStateAction<string>>;
  id: string;
  toast: ReturnType<typeof useToastHelpers>;
  setTemplate: React.Dispatch<React.SetStateAction<TemplatedSong | null>>;
}

function TagsSection({
  template,
  selectedTags,
  setSelectedTags,
  savingTags,
  setSavingTags,
  tagsError,
  setTagsError,
  tagSearch,
  setTagSearch,
  id,
  toast,
  setTemplate,
}: TagsSectionProps) {
  const recommended = useMemo(
    () =>
      getRecommendedTags({
        title: template.title,
        description: template.description,
        music_style: template.music_style,
        language: template.language,
      }),
    [template.title, template.description, template.music_style, template.language]
  );

  const [customTagInput, setCustomTagInput] = useState("");

  function addCustomTag() {
    const tag = customTagInput.toLowerCase().trim().replace(/\s+/g, "-");
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags((prev) => [...prev, tag]);
    }
    setCustomTagInput("");
  }

  const lowerSearch = tagSearch.toLowerCase().trim();

  const filteredGroups = TAG_GROUPS.map((group) => ({
    ...group,
    tags: group.tags.filter(
      (t) => !lowerSearch || t.includes(lowerSearch)
    ),
  })).filter((g) => g.tags.length > 0);

  function toggle(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function saveTags() {
    setSavingTags(true);
    setTagsError(null);
    try {
      const res = await fetch(`/api/admin/templated-songs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: selectedTags }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setTemplate((prev) => (prev ? { ...prev, tags: selectedTags } : null));
      toast.success("Tags saved", "Template tags have been updated successfully.");
    } catch (e: unknown) {
      setTagsError(e instanceof Error ? e.message : "Failed to save tags");
    } finally {
      setSavingTags(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-700">Tags</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Tag this song by vibe, audience, genre, and occasion for internal organization.
        </p>
      </div>

      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 border border-yellow-300 text-xs font-medium px-2 py-0.5 rounded-full"
            >
              {tag}
              <button
                type="button"
                onClick={() => toggle(tag)}
                className="hover:text-yellow-900"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Recommended */}
      {recommended.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Recommended for this song</p>
          <div className="flex flex-wrap gap-1.5">
            {recommended.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggle(tag)}
                className={`text-xs px-2.5 py-0.5 rounded-full border font-medium transition-colors ${
                  selectedTags.includes(tag)
                    ? "bg-yellow-500 text-white border-yellow-500"
                    : "bg-white text-gray-600 border-gray-300 hover:border-yellow-400 hover:text-yellow-700"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        value={tagSearch}
        onChange={(e) => setTagSearch(e.target.value)}
        placeholder="Search tags…"
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm w-56 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none"
      />

      {/* Tag groups */}
      <div className="space-y-3">
        {filteredGroups.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              {group.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggle(tag)}
                  className={`text-xs px-2.5 py-0.5 rounded-full border font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? "bg-yellow-500 text-white border-yellow-500"
                      : "bg-white text-gray-600 border-gray-300 hover:border-yellow-400 hover:text-yellow-700"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        ))}
        {filteredGroups.length === 0 && (
          <p className="text-sm text-gray-400">No tags match &ldquo;{tagSearch}&rdquo;</p>
        )}
      </div>

      {/* Custom tag input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={customTagInput}
          onChange={(e) => setCustomTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); addCustomTag(); }
          }}
          placeholder="Add custom tag…"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm w-48 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none"
        />
        <button
          type="button"
          onClick={addCustomTag}
          disabled={!customTagInput.trim()}
          className="inline-flex items-center bg-white border border-gray-300 hover:border-yellow-500 hover:text-yellow-700 disabled:opacity-40 text-gray-600 px-3 py-1.5 rounded-md text-sm font-medium"
        >
          Add
        </button>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          disabled={savingTags}
          onClick={saveTags}
          className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-md text-sm font-medium"
        >
          {savingTags ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save tags
        </button>
        {selectedTags.length > 0 && (
          <span className="text-xs text-gray-500">{selectedTags.length} tag{selectedTags.length !== 1 ? "s" : ""} selected</span>
        )}
      </div>

      {tagsError && <p className="text-sm text-red-600">{tagsError}</p>}
    </div>
  );
}
