"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { trackCTAEvent, trackNavigationEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";
import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
import { SongThumbnail } from "./SongThumbnail";

interface LyricLine {
  index: number;
  text: string;
  start: number;
  end: number;
  isActive: boolean;
  isPast: boolean;
}

interface SongContentProps {
  songTitle: string;
  imageUrl: string | null;
  lyrics: LyricLine[];
  hasLyrics: () => boolean;
  onViewLyrics: () => void;
  isPlaying: boolean;
  showLyrics: boolean;
  lyricsContainerRef: React.RefObject<HTMLDivElement | null>;
  lyricRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  getBarHeight: (index: number) => number;
  songDescription?: string;
  languageLinks?: Array<{ slug: string; name: string; nativeName: string }>;
}

function CollapsibleDescription({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const trimmed = text.trim();

  useLayoutEffect(() => {
    setExpanded(false);
  }, [trimmed]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !trimmed) {
      setCanExpand(false);
      return;
    }
    if (expanded) return;
    setCanExpand(el.scrollHeight > el.clientHeight + 1);
  }, [trimmed, expanded]);

  if (!trimmed) return null;

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <p
        ref={ref}
        className={cn(
          "text-sm md:text-[0.9375rem] text-text-teal/65 font-body leading-relaxed max-w-lg mx-auto text-center",
          !expanded && "line-clamp-1",
        )}
      >
        {trimmed}
      </p>
      {canExpand && (
        <button
          type="button"
          onClick={() => {
            const next = !expanded;
            setExpanded(next);
            trackCTAEvent.ctaClick(
              next ? "description_read_more" : "description_show_less",
              "song_player",
              "button",
            );
          }}
          className="text-xs text-text-teal/35 hover:text-text-teal/55 transition-colors underline-offset-2 hover:underline"
        >
          {expanded ? "less" : "more"}
        </button>
      )}
    </div>
  );
}

function LanguageLinks({
  languageLinks,
  compact = false,
}: {
  languageLinks: Array<{ slug: string; name: string; nativeName: string }>;
  compact?: boolean;
}) {
  if (languageLinks.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-2 px-2",
        compact ? "mt-1 mb-1" : "mb-8",
      )}
    >
      {languageLinks.map((lang) => (
        <Link
          key={lang.slug}
          href={`/languages/${lang.slug}`}
          onClick={() =>
            trackNavigationEvent.click(
              `More ${lang.name} songs`,
              `/languages/${lang.slug}`,
              "song_language_link",
            )
          }
          className="inline-flex items-center gap-1.5 rounded-full border border-text-teal/15 bg-white/60 px-3 py-1.5 text-xs sm:text-sm text-text-teal/75 hover:text-text-teal hover:border-primary-yellow/40 hover:bg-white transition-colors"
        >
          <span>More {lang.name} songs</span>
          <span lang={lang.slug} className="text-text-teal/55">
            ({lang.nativeName})
          </span>
        </Link>
      ))}
    </div>
  );
}

export function SongContent({
  songTitle,
  imageUrl,
  lyrics,
  hasLyrics,
  onViewLyrics,
  isPlaying,
  showLyrics,
  lyricsContainerRef,
  lyricRefs,
  getBarHeight,
  songDescription,
  languageLinks,
}: SongContentProps) {
  const [bgHasError, setBgHasError] = useState(false);

  // If lyrics are available and should be shown, render lyrics view
  if (showLyrics && lyrics.length > 0) {
    return (
      <div className="flex-1 bg-secondary-cream relative overflow-hidden">
        {/* Blurred Background */}
        {imageUrl && !bgHasError && (
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20 transition-opacity duration-1000">
            <Image
              src={imageUrl}
              alt=""
              fill
              className="object-cover blur-3xl scale-150 animate-pulse-slow"
              onError={() => setBgHasError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-secondary-cream/90 via-secondary-cream/80 to-secondary-cream/95"></div>
          </div>
        )}

        {/* Single Scroll Container: header stays sticky, lyrics scroll underneath */}
        <div
          ref={lyricsContainerRef}
          className="relative z-10 h-[calc(100vh-200px)] overflow-y-auto scroll-smooth [&::-webkit-scrollbar]:hidden pb-48 md:pb-32"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {/* Sticky header */}
          <div className="sticky top-0 z-20 bg-white/40 backdrop-blur-md">
            <div className="max-w-6xl mx-auto px-4 md:px-10 py-3 md:py-6 flex flex-col items-center text-center gap-2 md:gap-3">
              <SongThumbnail
                imageUrl={imageUrl}
                title={songTitle}
                isPlaying={isPlaying}
                size="sm"
                className="mb-0"
              />
              <div className="flex flex-col items-center -mt-1 gap-1">
                <h3 className="text-sm md:text-base font-bold text-text-teal line-clamp-1 leading-tight">
                  {songTitle}
                </h3>
                {songDescription?.trim() && (
                  <p className="text-[11px] md:text-xs text-text-teal/55 font-body leading-snug max-w-[min(100%,18rem)] mx-auto line-clamp-2 text-center px-1">
                    {songDescription.trim()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Lyrics */}
          <div className="px-6 md:px-12">
            {/* Vertical padding so first/last lines can still center */}
            <div className="h-[30vh] md:h-[35vh]"></div>

            <div className="max-w-4xl mx-auto pb-10">
              <div className="space-y-8 md:space-y-12">
                {lyrics.map((line, index) => (
                  <div
                    key={index}
                    ref={(el) => {
                      lyricRefs.current[index] = el;
                    }}
                    className={`text-center transition-all duration-500 ease-out min-h-[4rem] md:min-h-[5rem] flex items-center justify-center relative ${
                      line.isActive
                        ? "text-xl md:text-2xl lg:text-3xl font-bold !text-accent-coral transform scale-105 md:scale-110"
                        : line.isPast
                          ? "text-base md:text-lg text-text-teal/40 opacity-60 blur-[0.5px]"
                          : "text-base md:text-lg text-text-teal/60 opacity-80"
                    }`}
                    style={{
                      transform: line.isActive ? "scale(1.05)" : "scale(1)",
                    }}
                  >
                    <span
                      className={`leading-relaxed max-w-full break-words ${line.isActive ? "!text-accent-coral" : ""}`}
                      style={
                        line.isActive
                          ? { color: "var(--accent-coral)" }
                          : undefined
                      }
                    >
                      {line.text || "\u00A0"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-[30vh] md:h-[35vh]"></div>
          </div>
        </div>
      </div>
    );
  }

  // Default centered view with thumbnail
  return (
    <div className="flex-1 bg-secondary-cream flex items-center justify-center pb-24 md:pb-32 min-h-[500px] relative overflow-hidden">
      {/* Blurred Background */}
      {imageUrl && !bgHasError && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20 transition-opacity duration-1000">
          <Image
            src={imageUrl}
            alt=""
            fill
            className="object-cover blur-3xl scale-150 animate-pulse-slow"
            onError={() => setBgHasError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-secondary-cream/80 via-secondary-cream/50 to-secondary-cream/90"></div>
        </div>
      )}

      <div className="text-center max-w-2xl mx-auto px-6 w-full relative z-10">
        {/* Song Thumbnail */}
        <SongThumbnail
          imageUrl={imageUrl}
          title={songTitle}
          isPlaying={isPlaying}
        />

        {/* Song Title */}
        <h1 className="text-3xl md:text-4xl lg:text-6xl font-bold text-text-teal font-heading mb-3 leading-tight tracking-tight drop-shadow-sm">
          {songTitle}
        </h1>

        <CollapsibleDescription
          text={songDescription ?? ""}
          className="mb-6 px-1"
        />

        {/* CTAs: View Lyrics */}
        {hasLyrics() && (
          <div className="mb-12 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Button
              variant="outline"
              onClick={() => {
                onViewLyrics();
                trackCTAEvent.ctaClick("view_lyrics", "song_player", "button");
              }}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full border-2 border-text-teal/10 bg-white/50 backdrop-blur-sm text-text-teal hover:border-primary-yellow hover:bg-primary-yellow hover:text-text-teal transition-all duration-300 font-bold shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
            >
              <FileText className="h-5 w-5" />
              <span>View Lyrics</span>
            </Button>
          </div>
        )}

        {/* Visualizer Placeholder - Enhanced */}
        <div className="mb-8 flex items-center justify-center">
          <div className="flex items-end justify-center space-x-1.5 h-16 md:h-24">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className={`w-2 md:w-2.5 rounded-t-full transition-all duration-300 ease-in-out ${
                  isPlaying
                    ? "bg-gradient-to-t from-primary-yellow to-accent-coral opacity-90"
                    : "bg-gray-200 h-2 opacity-50"
                }`}
                style={{
                  height: isPlaying ? `${getBarHeight(i) * 1.5}px` : "8px",
                  animation: isPlaying
                    ? `bounce-gentle 1s infinite ${i * 0.1}s`
                    : "none",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
