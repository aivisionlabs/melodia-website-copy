import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  X,
  Rewind,
  FastForward,
  AlertCircle,
  FileText,
} from "lucide-react";
import Image from "next/image";
import { ShareButton } from "@/components/ShareButton";
import { SongLikeButton } from "@/components/SongLikeButton";
import { LyricsViewerModal } from "@/components/LyricsViewerModal";
import {
  trackCTAEvent,
  trackEngagementEvent,
  trackNavigationEvent,
} from "@/lib/analytics";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useLyrics } from "@/hooks/useLyrics";

interface LyricLine {
  index: number;
  text: string;
  start: number;
  end: number;
}

interface SunoVariant {
  audioUrl: string;
  sourceImageUrl?: string;
  imageUrl: string;
  prompt: string;
  modelName: string;
  title: string;
}

interface MediaPlayerProps {
  song: {
    title: string;
    artist: string;
    audioUrl?: string;
    song_url?: string;
    videoUrl?: string;
    lyrics?: LyricLine[];
    timestamp_lyrics?: LyricLine[];
    timestamped_lyrics_variants?: {
      [variantIndex: number]: LyricLine[];
    } | null;
    selected_variant?: number;
    slug?: string;
    show_lyrics?: boolean;
    plain_lyrics?: string | null;
    likes_count?: number;
    suno_variants?: SunoVariant[] | null;
  };
  onClose: () => void;
}

export const MediaPlayer = ({ song, onClose }: MediaPlayerProps) => {
  // Use audio player hook
  const {
    isPlaying,
    currentTime,
    duration,
    audioError,
    isLoading,
    isPlayLoading,
    togglePlay,
    skipTime,
    seekTo,
    formatTime,
    audioRef,
  } = useAudioPlayer({
    audioUrl: song.song_url || song.audioUrl,
    songTitle: song.title,
    songId: song.slug || "unknown",
    songSlug: song.slug,
    songMetadata: {
      music_style: (song as any).music_style,
      song_description: (song as any).song_description,
      categories: (song as any).categories,
    },
  });

  // Convert current time to milliseconds for timestamp comparison
  const currentTimeMs = currentTime * 1000;

  // Generate deterministic heights for visualizer bars to avoid hydration mismatch
  const getBarHeight = (index: number) => {
    return 20 + (Math.sin(index * 0.5) * 0.5 + 0.5) * 40;
  };

  // Get variant image URL for thumbnail
  const getVariantImageUrl = (): string | null => {
    const variants = song.suno_variants as any;

    // Handle object format (single variant)
    if (variants && typeof variants === "object" && !Array.isArray(variants)) {
      if ("sourceImageUrl" in variants) return variants.sourceImageUrl ?? null;
      if ("imageUrl" in variants) return variants.imageUrl ?? null;
    }

    // Handle array format (multiple variants)
    if (Array.isArray(variants) && variants.length > 0) {
      const selectedIndex = song.selected_variant ?? 0;
      const selectedVariant = variants[selectedIndex] || variants[0];
      return (
        selectedVariant?.sourceImageUrl || selectedVariant?.imageUrl || null
      );
    }

    return null;
  };

  // Use lyrics hook
  const {
    lyrics,
    isLoadingLyrics,
    showLyricsViewer,
    setShowLyricsViewer,
    hasLyrics,
    getLyricsData,
    lyricsContainerRef,
    lyricRefs,
    shouldShowLyrics,
  } = useLyrics({
    song,
    currentTimeMs,
    isPlaying,
    audioError,
  });

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm md:p-4">
      <div className="bg-secondary-cream rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] md:max-h-[90vh] overflow-hidden border border-white/20 animate-fade-in-up flex flex-col">
        {/* Header - Compact styling */}
        <div className="bg-white p-3 md:p-4 text-text-teal shadow-sm relative z-10 flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* Melodia Branding */}
            <div className="flex items-center gap-2">
              <Image
                src="/images/melodia-logo-transparent.png"
                alt="Melodia"
                width={40}
                height={40}
                className="h-8 w-auto rounded flex-shrink-0 object-contain"
              />
            </div>

            {/* Header Actions - Share, Close */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <ShareButton
                slug={song.slug}
                title={`${song.title}`}
                onShare={() =>
                  trackEngagementEvent.share(
                    song.title,
                    song.slug || "unknown",
                    "native_share"
                  )
                }
                onCopyLink={() =>
                  trackEngagementEvent.copyLink(
                    song.title,
                    song.slug || "unknown"
                  )
                }
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  trackNavigationEvent.click(
                    "close_player",
                    window.location.href,
                    "button"
                  );
                  onClose();
                }}
                className="h-8 w-8 md:h-9 md:w-9 p-0 text-text-teal hover:bg-gray-100 rounded-full flex-shrink-0 transition-colors"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Status Messages - Matching FullPageMediaPlayer */}
          {audioError && (
            <div className="flex items-center gap-2 text-accent-coral text-xs md:text-sm justify-center mt-2 font-medium">
              <AlertCircle className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span>
                Demo mode: Use controls below to experience synchronized lyrics
              </span>
            </div>
          )}
          {isLoading && !audioError && (
            <div className="flex items-center gap-2 text-text-teal/70 text-xs md:text-sm justify-center mt-2">
              <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-primary-yellow"></div>
              <span>Loading audio...</span>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden bg-gradient-to-b from-secondary-cream to-white flex flex-col">
          {shouldShowLyrics && lyrics.length > 0 ? (
            // Synchronized Lyrics Section
            <>
              {/* Status indicator */}
              {(!isPlaying || audioError) && (
                <div className="px-4 md:px-6 py-3 bg-secondary-cream border-b border-primary-yellow/10 flex-shrink-0">
                  <div className="flex items-center gap-3 text-sm text-text-teal/80">
                    <div className="w-2 h-2 bg-primary-yellow rounded-full flex-shrink-0"></div>
                    <span className="leading-relaxed font-medium">
                      {isLoadingLyrics
                        ? "Loading lyrics..."
                        : audioError &&
                          "Demo mode - click play to experience synchronized lyrics"}
                    </span>
                  </div>
                </div>
              )}

              {/* Lyrics Container - Matching FullPageMediaPlayer styling */}
              <div
                ref={lyricsContainerRef}
                className="flex-1 overflow-y-auto px-6 md:px-12 py-6 md:py-8 scroll-smooth [&::-webkit-scrollbar]:hidden"
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                {isLoadingLyrics ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-yellow mx-auto mb-4"></div>
                      <p className="text-lg text-text-teal/60 font-medium">
                        Loading lyrics...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 md:space-y-8">
                    {lyrics.map((line, index) => (
                      <div
                        key={index}
                        ref={(el) => {
                          lyricRefs.current[index] = el;
                        }}
                        className={`text-center transition-all duration-700 ease-out min-h-[3rem] md:min-h-[3.5rem] flex items-center justify-center relative ${
                          line.isActive
                            ? "text-xl md:text-2xl font-bold !text-accent-coral transform scale-105"
                            : line.isPast
                              ? "text-base md:text-lg text-gray-400 opacity-60"
                              : "text-base md:text-lg text-gray-500 opacity-80"
                        }`}
                        style={{
                          transform: line.isActive ? "scale(1.05)" : "scale(1)",
                          transition: "all 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                      >
                        {/* Active lyric indicator */}
                        {line.isActive && (
                          <div className="absolute -left-0 md:-left-4 top-1/2 transform -translate-y-1/2 w-2 h-2 md:w-3 md:h-3 bg-yellow-500 rounded-full animate-pulse shadow-lg"></div>
                        )}

                        {/* Progress indicator for active lyric */}
                        {line.isActive && (
                          <div className="absolute -left-1 md:-left-6 top-1/2 transform -translate-y-1/2 w-1 h-6 md:h-8 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-full"></div>
                        )}

                        <span
                          className={`px-4 md:px-6 py-2 md:py-3 rounded-lg leading-relaxed max-w-full break-words font-body ${line.isActive ? "!text-accent-coral" : ""}`}
                          style={
                            line.isActive
                              ? { color: "var(--accent-coral)" }
                              : undefined
                          }
                        >
                          {line.text || "\u00A0"}
                        </span>

                        {/* Subtle glow effect for active lyric */}
                        {line.isActive && (
                          <div className="absolute inset-0 bg-yellow-100 rounded-lg opacity-20 blur-sm"></div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Bottom padding */}
                <div className="h-16 md:h-20"></div>
              </div>
            </>
          ) : (
            // No Lyrics Section - Music Experience with vinyl disc
            <div className="flex-1 flex items-center justify-center p-6 md:p-8 overflow-auto relative">
              {/* Blurred Background */}
              {getVariantImageUrl() && (
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20 transition-opacity duration-1000">
                  <Image
                    src={getVariantImageUrl()!}
                    alt=""
                    fill
                    className="object-cover blur-3xl scale-150 animate-pulse-slow"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-secondary-cream/80 via-secondary-cream/50 to-secondary-cream/90"></div>
                </div>
              )}

              <div className="text-center max-w-md mx-auto relative z-10">
                {/* Vinyl Style Disc with Thumbnail */}
                <div className="mb-6 md:mb-8 relative">
                  {/* Glowing pulse effects when playing */}
                  {isPlaying && (
                    <>
                      <div className="absolute inset-0 -z-10 bg-primary-yellow/40 rounded-full blur-3xl animate-pulse transform scale-110 duration-1000"></div>
                      <div className="absolute inset-0 -z-10 bg-accent-coral/30 rounded-full blur-2xl animate-pulse delay-75 transform scale-125 duration-2000"></div>
                    </>
                  )}

                  <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center mx-auto shadow-2xl relative overflow-hidden border-[6px] border-white bg-white group">
                    {getVariantImageUrl() ? (
                      <Image
                        src={getVariantImageUrl()!}
                        alt={song.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary-yellow to-yellow-400" />
                    )}
                    {/* Vinyl grooves effect */}
                    <div className="absolute inset-4 rounded-full border border-text-teal/5"></div>
                    <div className="absolute inset-6 rounded-full border border-text-teal/5"></div>
                    <div className="absolute inset-8 rounded-full border border-text-teal/5"></div>
                    {/* Vinyl Texture Overlay */}
                    <div className="absolute inset-0 rounded-full bg-[url('/images/vinyl-texture.png')] opacity-20 pointer-events-none mix-blend-overlay"></div>
                    {/* Shiny Reflection */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none"></div>
                    {/* Center hole for vinyl look */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 bg-secondary-cream rounded-full z-20 border border-gray-100 shadow-inner"></div>
                  </div>
                </div>

                {/* Song Title - Matching FullPageMediaPlayer */}
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-text-teal mb-2 font-heading leading-tight tracking-tight drop-shadow-sm">
                  {song.title}
                </h2>

                {/* Artist */}
                <p className="text-base md:text-lg text-text-teal/70 mb-6 md:mb-8 font-medium font-body tracking-wide">
                  Melodia
                </p>

                {/* Lyrics CTA Button - Matching FullPageMediaPlayer */}
                {hasLyrics() && (
                  <div className="mb-6 md:mb-8">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowLyricsViewer(true);
                        trackCTAEvent.ctaClick(
                          "view_lyrics",
                          "media_player",
                          "button"
                        );
                      }}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border-2 border-text-teal/10 bg-white/50 backdrop-blur-sm text-text-teal hover:border-primary-yellow hover:bg-primary-yellow hover:text-text-teal transition-all duration-300 font-bold shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                    >
                      <FileText className="h-4 w-4" />
                      <span>View Lyrics</span>
                    </Button>
                  </div>
                )}

                {/* Visualizer - Matching FullPageMediaPlayer */}
                <div className="flex items-center justify-center">
                  <div className="flex items-end justify-center space-x-1 md:space-x-1.5 h-12 md:h-16">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 md:w-2 rounded-t-full transition-all duration-300 ease-in-out ${
                          isPlaying
                            ? "bg-gradient-to-t from-primary-yellow to-accent-coral opacity-90"
                            : "bg-gray-200 opacity-50"
                        }`}
                        style={{
                          height: isPlaying
                            ? `${getBarHeight(i) * 1.2}px`
                            : "6px",
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
          )}
        </div>

        {/* Bottom Player Controls - Matching FullPageMediaPlayer styling */}
        <div className="bg-white border-t border-gray-200 p-4 md:p-5 flex-shrink-0">
          <audio
            ref={audioRef}
            src={song.song_url || song.audioUrl || undefined}
            preload="auto"
            playsInline
            controls={false}
            muted={false}
          />

          {/* Song Title Row - Mobile: top row, Desktop: inline with controls */}
          <div className="flex items-center justify-between mb-3 md:hidden">
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-bold text-text-teal truncate text-sm font-heading">
                {song.title}
              </span>
              <span className="text-xs text-text-teal/70 truncate font-medium">
                Melodia
              </span>
            </div>
          </div>

          {/* Main Controls Row */}
          <div className="flex items-center justify-between mb-4 gap-2 md:gap-4">
            {/* Left: Song Info + Like Button - Hidden on mobile, visible on md+ */}
            <div className="hidden md:flex items-center gap-3 flex-1 min-w-0">
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-text-teal truncate text-base font-heading">
                  {song.title}
                </span>
                <span className="text-xs text-text-teal/70 truncate font-medium">
                  Melodia
                </span>
              </div>
              <SongLikeButton
                slug={song.slug || ""}
                initialCount={song.likes_count || 0}
                size="sm"
                songTitle={song.title}
                songId={song.slug || ""}
                pageContext="media_player"
              />
            </div>

            {/* Mobile: Like Button on left */}
            <div className="flex md:hidden items-center justify-start flex-shrink-0">
              <SongLikeButton
                slug={song.slug || ""}
                initialCount={song.likes_count || 0}
                size="sm"
                songTitle={song.title}
                songId={song.slug || ""}
                pageContext="media_player"
              />
            </div>

            {/* Center: Playback Controls */}
            <div className="flex items-center justify-center gap-3 md:gap-4 flex-1 md:flex-shrink-0 md:flex-grow-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => skipTime(-10)}
                disabled={isLoading}
                className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-gray-100 shadow-sm hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-text-teal"
              >
                <Rewind className="h-4 w-4 md:h-5 md:w-5" />
              </Button>

              <Button
                variant="ghost"
                size="lg"
                onClick={togglePlay}
                disabled={isLoading || isPlayLoading}
                className="h-12 w-12 md:h-16 md:w-16 rounded-full bg-primary-yellow hover:bg-yellow-400 text-text-teal shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
              >
                {isPlayLoading ? (
                  <div className="flex flex-col items-center justify-center gap-1 text-center">
                    <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-2 border-text-teal border-t-transparent flex-shrink-0"></div>
                  </div>
                ) : isPlaying ? (
                  <Pause className="h-5 w-5 md:h-8 md:w-8" />
                ) : (
                  <Play className="h-5 w-5 md:h-8 md:w-8 ml-0.5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => skipTime(10)}
                disabled={isLoading}
                className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-gray-100 shadow-sm hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-text-teal"
              >
                <FastForward className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </div>

            {/* Right: Spacer to balance layout - Hidden on mobile, visible on md+ */}
            <div className="hidden md:flex flex-1"></div>

            {/* Mobile: Empty spacer for balance */}
            <div className="flex md:hidden flex-shrink-0 w-10"></div>
          </div>

          {/* Progress Bar - Matching FullPageMediaPlayer */}
          <div className="space-y-2">
            <Slider
              value={[currentTime]}
              max={duration || 40}
              step={0.1}
              className="w-full"
              disabled={isLoading}
              onValueChange={(value) => {
                const newTime = value[0];
                seekTo(newTime);
              }}
            />
            <div className="flex justify-between text-xs md:text-sm text-text-teal/70 font-medium">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration || 40)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lyrics Viewer Modal */}
      <LyricsViewerModal
        show={showLyricsViewer}
        onClose={() => setShowLyricsViewer(false)}
        title={song.title}
        songSlug={song.slug}
        songId={song.slug || "unknown"}
        lyricsData={getLyricsData()}
        isLoading={false}
      />
    </div>
  );
};
