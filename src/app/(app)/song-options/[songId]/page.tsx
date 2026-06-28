"use client";

import SongCreationLoadingScreen from "@/components/SongCreationLoadingScreen";
import SongOptionsDisplay from "@/components/SongOptionsDisplay";
import Header from "@/components/Header";
import { LoginPromptCard } from "@/components/LoginPromptCard";
import { useAuth } from "@/contexts/AuthContext";
import { useSongStatusPolling } from "@/hooks/use-song-status-polling";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useRef } from "react";
import { trackFunnelEvent } from "@/lib/analytics";

export default function SongOptionsPage({
  params,
}: {
  params: Promise<{ songId: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { songId } = use(params);
  const { isAuthenticated } = useAuth();

  // Get song-variant query parameter (defaults to 0 if not provided)
  const variantIndexParam = searchParams.get("song-variant");
  let initialVariantIndex = variantIndexParam
    ? parseInt(variantIndexParam, 10)
    : 0;

  // Validate variant index is a valid number
  if (isNaN(initialVariantIndex) || initialVariantIndex < 0) {
    initialVariantIndex = 0;
  }

  const { songStatus, isLoading, error } = useSongStatusPolling(
    songId ? parseInt(songId) : null,
    {
      intervalMs: 10000,
      maxPollingTime: 10 * 60 * 1000,
      autoStart: !!songId,
      stopOnComplete: true,
      enableExponentialBackoff: true,
      maxRetries: 3,
    },
  );

  const handleBack = () => {
    router.push("/");
  };

  const isFirstVariantStreamReady =
    songStatus?.variants?.[0]?.variantStatus === "STREAM_READY" ||
    songStatus?.variants?.[0]?.variantStatus === "DOWNLOAD_READY";

  const hasTrackedOptionsViewRef = useRef(false);
  useEffect(() => {
    if (
      isFirstVariantStreamReady &&
      songId &&
      !hasTrackedOptionsViewRef.current
    ) {
      hasTrackedOptionsViewRef.current = true;
      trackFunnelEvent.songOptionsView(songId);
    }
  }, [isFirstVariantStreamReady, songId]);

  if (isLoading && !songStatus) {
    return (
      <div className="min-h-screen bg-white text-text-teal flex flex-col">
        {/* <Header showCreateSongCTA={false} /> */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-coral mx-auto mb-4"></div>
            <p className="text-text-teal">Loading song options...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white text-text-teal flex flex-col">
        <Header showCreateSongCTA={false} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-red-600 mb-2">
              {error || "An error occurred"}
            </h3>
            <div className="text-gray-600 mb-4">
              The song you&apos;re looking for doesn&apos;t exist or has been
              removed.
            </div>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-2 bg-accent-coral text-white rounded-full hover:bg-opacity-90 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isFirstVariantStreamReady) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <Header showCreateSongCTA={false} />
        <SongCreationLoadingScreen
          duration={120}
          stage="song"
          title="Crafting your song..."
          message="We are turning your story into a musical masterpiece. Hang tight!"
          showTimer={true}
        />
      </div>
    );
  }

  if (songStatus) {
    // Validate variant index is within bounds
    const maxVariantIndex = songStatus.variants
      ? songStatus.variants.length - 1
      : 0;
    const safeVariantIndex = Math.max(
      0,
      Math.min(initialVariantIndex, maxVariantIndex),
    );

    return (
      <div className="flex flex-col min-h-screen bg-white">
        <SongOptionsDisplay
          songStatus={songStatus}
          onBack={handleBack}
          initialVariantIndex={safeVariantIndex}
          fullHeight={isAuthenticated}
        />
        {!isAuthenticated && (
          <div className="mt-8 px-6 pb-6 flex justify-center">
            <div className="w-full max-w-md">
              <LoginPromptCard />
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
