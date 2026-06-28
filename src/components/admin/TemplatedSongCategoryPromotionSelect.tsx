"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import {
  promotionTagToAdminSetting,
  type TemplatedPromotionAdminSetting,
} from "@/lib/templated-songs/promotion-tag";

const SETTING_OPTIONS: Array<{
  value: TemplatedPromotionAdminSetting;
  label: string;
}> = [
  { value: "auto", label: "Auto (14d New)" },
  { value: "none", label: "None" },
  { value: "trending", label: "Trending" },
  { value: "most_preferred", label: "Most Preferred" },
  { value: "new", label: "New" },
];

interface TemplatedSongCategoryPromotionSelectProps {
  templatedSongId: number;
  categoryId: number;
  categoryName: string;
  promotionTag: string | null;
  suppressAutoNew: boolean;
  disabled?: boolean;
  onUpdated?: (
    templatedSongId: number,
    categoryId: number,
    setting: TemplatedPromotionAdminSetting,
  ) => void;
}

export function TemplatedSongCategoryPromotionSelect({
  templatedSongId,
  categoryId,
  categoryName,
  promotionTag,
  suppressAutoNew,
  disabled,
  onUpdated,
}: TemplatedSongCategoryPromotionSelectProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSetting = promotionTagToAdminSetting({
    promotionTag:
      promotionTag === "trending" ||
      promotionTag === "most_preferred" ||
      promotionTag === "new"
        ? promotionTag
        : null,
    suppressAutoNew,
  });

  async function handleChange(next: TemplatedPromotionAdminSetting) {
    if (next === currentSetting || saving) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/templated-songs/promotion-tag", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templatedSongId,
          categoryId,
          setting: next,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update promotion tag");
      }

      onUpdated?.(templatedSongId, categoryId, next);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-0.5 min-w-[9rem]">
      <label className="flex flex-col gap-0.5">
        <span className="text-[10px] font-medium text-gray-500 truncate max-w-[9rem]">
          {categoryName}
        </span>
        <span className="sr-only">Promotion tag for {categoryName}</span>
        <div className="relative">
          <select
            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 disabled:opacity-50"
            value={currentSetting}
            disabled={disabled || saving}
            onChange={(event) => {
              void handleChange(
                event.target.value as TemplatedPromotionAdminSetting,
              );
            }}
            aria-label={`Promotion tag for ${categoryName}`}
          >
            {SETTING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {saving ? (
            <Loader2
              className="pointer-events-none absolute right-1.5 top-1.5 h-3.5 w-3.5 animate-spin text-gray-400"
              aria-hidden
            />
          ) : null}
        </div>
      </label>
      {error ? (
        <span className="text-[10px] text-red-600" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
