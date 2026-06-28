/* eslint-disable @next/next/no-img-element */
"use client";

import type { RefObject } from "react";
import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Lock, Music2 } from "lucide-react";
import { InlineSongPlayer } from "@/components/create-song-request/InlineSongPlayer";
import { MOOD_CHIPS, OCCASION_MUSIC_CHIPS } from "./create-page-constants";
import type { LyricsInputMode, SongPreview } from "./create-page-types";
import { InfoBubble } from "./info-bubble";

export function CreatePageMusicSection({
  lyricsInputMode,
  moods,
  onToggleMood,
  musicTab,
  onTabSwitch,
  templatesLocked,
  sourceSongId,
  onUpdateSourceSongInUrl,
  templateScrollRef,
  templateLoadMoreSentinelRef,
  templateSongs,
  templatesLoading,
  templatesLoadingMore,
  templateHasMore,
  showOffCarouselSelectedSlot,
  sourceSongPreview,
  songForInlinePlayer,
  occasion,
  advancedMusicChips,
  onToggleAdvancedMusicChip,
  musicStyleNotes,
  onMusicStyleNotesChange,
}: {
  lyricsInputMode: LyricsInputMode;
  moods: string[];
  onToggleMood: (label: string) => void;
  musicTab: "create" | "template";
  onTabSwitch: (tab: "create" | "template") => void;
  templatesLocked: boolean;
  sourceSongId: number | null;
  onUpdateSourceSongInUrl: (id: number | null) => void;
  templateScrollRef: RefObject<HTMLDivElement | null>;
  templateLoadMoreSentinelRef: RefObject<HTMLDivElement | null>;
  templateSongs: SongPreview[];
  templatesLoading: boolean;
  templatesLoadingMore: boolean;
  templateHasMore: boolean;
  showOffCarouselSelectedSlot: boolean;
  sourceSongPreview: SongPreview | null;
  songForInlinePlayer: SongPreview | null;
  occasion: string;
  advancedMusicChips: string[];
  onToggleAdvancedMusicChip: (chip: string) => void;
  musicStyleNotes: string;
  onMusicStyleNotesChange: (val: string) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const occasionChips =
    OCCASION_MUSIC_CHIPS[occasion] ?? OCCASION_MUSIC_CHIPS["Other"] ?? [];

  // Show tabs only while loading (count unknown) or when there are enough templates.
  // If loading is done and fewer than 3 templates exist, skip the tab switcher entirely.
  const showTabs = templatesLoading || templateSongs.length >= 3;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-bold font-heading text-text-teal">
          {lyricsInputMode === "lyrics" ? "Song vibe" : "Music Style"}
        </h2>
        <InfoBubble
          text={
            lyricsInputMode === "lyrics"
              ? "Pick the overall vibe for your song. Reference styles from other songs are not used when you bring your own lyrics."
              : "Define the musical vibe — create your own mood or pick from existing song styles."
          }
        />
      </div>

      {lyricsInputMode === "lyrics" ? (
        <div>
          {moods.length > 0 && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-[11px] text-text-teal/50 font-medium">
                Selected vibes:
              </span>
              {moods.map((m) => (
                <span
                  key={m}
                  className="px-2.5 py-1 bg-accent-coral/10 text-accent-coral border border-accent-coral/25 rounded-full text-[11px] font-bold"
                >
                  {m}
                </span>
              ))}
            </div>
          )}
          <div className="grid grid-cols-4 gap-2.5">
            {MOOD_CHIPS.map(({ label, emoji }) => {
              const isSelected = moods.includes(label);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => onToggleMood(label)}
                  className={`relative flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl border-2 text-center transition-all duration-200 ${
                    isSelected
                      ? "bg-accent-coral border-accent-coral shadow-lg active:scale-[0.93]"
                      : "bg-white border-gray-200 hover:border-accent-coral/40 hover:shadow-sm active:scale-[0.93]"
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center">
                      <Check
                        className="w-2 h-2 text-accent-coral"
                        strokeWidth={3.5}
                      />
                    </span>
                  )}
                  <span className="text-xl leading-none">{emoji}</span>
                  <span
                    className={`text-[10px] font-bold leading-tight ${
                      isSelected ? "text-white" : "text-text-teal"
                    }`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
          <AdvancedMusicSettings
            showAdvanced={showAdvanced}
            onToggleAdvanced={() => setShowAdvanced((p) => !p)}
            occasionChips={occasionChips}
            advancedMusicChips={advancedMusicChips}
            onToggleAdvancedMusicChip={onToggleAdvancedMusicChip}
            musicStyleNotes={musicStyleNotes}
            onMusicStyleNotesChange={onMusicStyleNotesChange}
          />
        </div>
      ) : (
        <>
          {showTabs && (
            <div className="flex bg-gray-100 rounded-2xl p-1 mb-5">
              <button
                type="button"
                onClick={() => onTabSwitch("template")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  musicTab === "template"
                    ? "bg-white text-text-teal shadow-sm"
                    : "text-text-teal/40 hover:text-text-teal/60"
                }`}
              >
                {templatesLocked ? (
                  <>
                    <Lock className="w-3 h-3 text-text-teal/35" />
                    <span>Choose from styles</span>
                  </>
                ) : (
                  "🎵 Choose from templates"
                )}
              </button>
              <button
                type="button"
                onClick={() => onTabSwitch("create")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  musicTab === "create"
                    ? "bg-white text-text-teal shadow-sm"
                    : "text-text-teal/40 hover:text-text-teal/60"
                }`}
              >
                🎨 Create your own
              </button>
            </div>
          )}

          {(!showTabs || musicTab === "create") && (
            <div>
              {moods.length > 0 && (
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className="text-[11px] text-text-teal/50 font-medium">
                    Selected vibes:
                  </span>
                  {moods.map((m) => (
                    <span
                      key={m}
                      className="px-2.5 py-1 bg-accent-coral/10 text-accent-coral border border-accent-coral/25 rounded-full text-[11px] font-bold"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-4 gap-2.5">
                {MOOD_CHIPS.map(({ label, emoji }) => {
                  const isSelected = moods.includes(label);
                  const isDisabled = !!sourceSongId;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => !isDisabled && onToggleMood(label)}
                      disabled={isDisabled}
                      className={`relative flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl border-2 text-center transition-all duration-200 ${
                        isDisabled
                          ? "bg-gray-50 border-gray-100 opacity-40 cursor-not-allowed"
                          : isSelected
                            ? "bg-accent-coral border-accent-coral shadow-lg active:scale-[0.93]"
                            : "bg-white border-gray-200 hover:border-accent-coral/40 hover:shadow-sm active:scale-[0.93]"
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center">
                          <Check
                            className="w-2 h-2 text-accent-coral"
                            strokeWidth={3.5}
                          />
                        </span>
                      )}
                      <span className="text-xl leading-none">{emoji}</span>
                      <span
                        className={`text-[10px] font-bold leading-tight ${
                          isSelected ? "text-white" : "text-text-teal"
                        }`}
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <AdvancedMusicSettings
                showAdvanced={showAdvanced}
                onToggleAdvanced={() => setShowAdvanced((p) => !p)}
                occasionChips={occasionChips}
                advancedMusicChips={advancedMusicChips}
                onToggleAdvancedMusicChip={onToggleAdvancedMusicChip}
                musicStyleNotes={musicStyleNotes}
                onMusicStyleNotesChange={onMusicStyleNotesChange}
              />
            </div>
          )}

          {showTabs && musicTab === "template" && (
            <div>
              {templatesLocked && (
                <div className="mb-3 flex items-center gap-2 p-3 bg-primary-yellow/10 border border-primary-yellow/30 rounded-xl">
                  <Lock className="w-4 h-4 text-text-teal/50 flex-shrink-0" />
                  <p className="text-[11px] text-text-teal/65 leading-snug">
                    Upgrade to <strong>Standard Custom Song</strong> or{" "}
                    <strong>Pro Studio</strong> to use song style
                    templates
                  </p>
                </div>
              )}

              <div
                className={`relative ${templatesLocked ? "opacity-50 pointer-events-none" : ""}`}
              >
                {sourceSongId && (
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-text-teal/50">
                      Template selected
                    </p>
                    <button
                      type="button"
                      onClick={() => onUpdateSourceSongInUrl(null)}
                      className="text-[11px] font-semibold text-text-teal/50 hover:text-accent-coral transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}

                <div
                  ref={templateScrollRef}
                  className="flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory"
                >
                  {showOffCarouselSelectedSlot &&
                    (sourceSongPreview?.id === sourceSongId ? (
                      <div
                        key={`off-carousel-${sourceSongId}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => onUpdateSourceSongInUrl(sourceSongId)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ")
                            onUpdateSourceSongInUrl(sourceSongId);
                        }}
                        className="min-w-[170px] flex-shrink-0 rounded-xl border-2 p-3 cursor-pointer transition-all snap-start active:scale-[0.98] border-accent-coral bg-accent-coral/8 shadow-sm"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="relative h-11 w-11 overflow-hidden rounded-lg bg-gray-100 border border-gray-200 flex-shrink-0">
                            {sourceSongPreview.imageUrl ? (
                              <img
                                src={sourceSongPreview.imageUrl}
                                alt={sourceSongPreview.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full bg-gradient-to-br from-primary-yellow/20 to-accent-coral/20 flex items-center justify-center">
                                <Music2 className="w-4 h-4 text-text-teal/30" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-semibold text-text-teal leading-snug truncate">
                              {sourceSongPreview.title}
                            </p>
                            <span className="text-[10px] font-bold text-accent-coral">
                              ✓ Selected
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={`off-carousel-skel-${sourceSongId}`}
                        className="min-w-[170px] flex-shrink-0 rounded-xl border-2 border-accent-coral/40 bg-accent-coral/5 p-3 snap-start"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-11 w-11 rounded-lg bg-gray-100 animate-pulse flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-2.5 w-20 bg-gray-100 rounded animate-pulse" />
                            <div className="h-2 w-14 bg-accent-coral/20 rounded animate-pulse" />
                          </div>
                        </div>
                      </div>
                    ))}
                  {templatesLoading &&
                    templateSongs.length === 0 &&
                    Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="min-w-[170px] flex-shrink-0 rounded-xl border border-gray-200 bg-white p-3 snap-start"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-11 w-11 rounded-lg bg-gray-100 animate-pulse flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-2.5 w-20 bg-gray-100 rounded animate-pulse" />
                            <div className="h-2 w-14 bg-gray-100 rounded animate-pulse" />
                          </div>
                        </div>
                      </div>
                    ))}

                  {templateSongs.map((s) => {
                    const isSelected = sourceSongId === s.id;
                    return (
                      <div
                        key={s.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onUpdateSourceSongInUrl(s.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ")
                            onUpdateSourceSongInUrl(s.id);
                        }}
                        className={`min-w-[170px] flex-shrink-0 rounded-xl border-2 p-3 cursor-pointer transition-all snap-start active:scale-[0.98] ${
                          isSelected
                            ? "border-accent-coral bg-accent-coral/8 shadow-sm"
                            : "border-gray-200 bg-white hover:border-accent-coral/30"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="relative h-11 w-11 overflow-hidden rounded-lg bg-gray-100 border border-gray-200 flex-shrink-0">
                            {s.imageUrl ? (
                              <img
                                src={s.imageUrl}
                                alt={s.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full bg-gradient-to-br from-primary-yellow/20 to-accent-coral/20 flex items-center justify-center">
                                <Music2 className="w-4 h-4 text-text-teal/30" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-semibold text-text-teal leading-snug truncate">
                              {s.title}
                            </p>
                            {isSelected ? (
                              <span className="text-[10px] font-bold text-accent-coral">
                                ✓ Selected
                              </span>
                            ) : (
                              <span className="text-[10px] text-text-teal/45">
                                Use this style
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {templatesLoadingMore &&
                    Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={`more-skel-${i}`}
                        className="min-w-[170px] flex-shrink-0 rounded-xl border border-gray-200 bg-white p-3 snap-start"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-11 w-11 rounded-lg bg-gray-100 animate-pulse flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-2.5 w-20 bg-gray-100 rounded animate-pulse" />
                            <div className="h-2 w-14 bg-gray-100 rounded animate-pulse" />
                          </div>
                        </div>
                      </div>
                    ))}

                  {templateHasMore && !templatesLoading && (
                    <div
                      ref={templateLoadMoreSentinelRef}
                      className="w-px h-12 flex-shrink-0 self-center"
                      aria-hidden
                    />
                  )}
                </div>

                {sourceSongId !== null &&
                  (songForInlinePlayer ? (
                    <InlineSongPlayer
                      key={songForInlinePlayer.id}
                      song={songForInlinePlayer}
                      onClose={() => onUpdateSourceSongInUrl(null)}
                    />
                  ) : showOffCarouselSelectedSlot ? (
                    <div
                      className="mt-3 rounded-xl border border-gray-200 bg-white p-4 animate-pulse"
                      aria-hidden
                    >
                      <div className="h-4 w-48 bg-gray-100 rounded mb-3" />
                      <div className="h-12 w-full bg-gray-100 rounded" />
                    </div>
                  ) : null)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AdvancedMusicSettings({
  showAdvanced,
  onToggleAdvanced,
  occasionChips,
  advancedMusicChips,
  onToggleAdvancedMusicChip,
  musicStyleNotes,
  onMusicStyleNotesChange,
}: {
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  occasionChips: { label: string; emoji: string }[];
  advancedMusicChips: string[];
  onToggleAdvancedMusicChip: (chip: string) => void;
  musicStyleNotes: string;
  onMusicStyleNotesChange: (val: string) => void;
}) {
  return (
    <div className="mt-4 pt-3 border-t border-gray-100">
      <button
        type="button"
        onClick={onToggleAdvanced}
        className="flex items-center gap-1 text-[11px] text-text-teal/45 hover:text-text-teal/70 transition-colors"
      >
        {showAdvanced ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
        Advanced music settings
      </button>

      {showAdvanced && (
        <div className="mt-3 space-y-3">
          {occasionChips.length > 0 && (
            <div>
              <p className="text-[10px] text-text-teal/40 font-medium uppercase tracking-wide mb-2">
                Genre &amp; style
              </p>
              <div className="flex flex-wrap gap-2">
                {occasionChips.map(({ label, emoji }) => {
                  const isSelected = advancedMusicChips.includes(label);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => onToggleAdvancedMusicChip(label)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all active:scale-95 ${
                        isSelected
                          ? "bg-accent-coral text-white border-accent-coral shadow-sm"
                          : "bg-gray-50 text-text-teal border-gray-200 hover:border-accent-coral/40"
                      }`}
                    >
                      <span>{emoji}</span>
                      {label}
                      {isSelected && (
                        <Check className="w-3 h-3" strokeWidth={3} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] text-text-teal/40 font-medium uppercase tracking-wide mb-2">
              Anything else?
            </p>
            <textarea
              value={musicStyleNotes}
              onChange={(e) => onMusicStyleNotesChange(e.target.value)}
              placeholder='e.g. "slow intro, guitar-heavy, no drums"'
              rows={2}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-text-teal placeholder:text-text-teal/30 focus:outline-none focus:border-accent-coral/50 transition-colors resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
