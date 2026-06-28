"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  Rewind,
  FastForward,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

function ChristmasContent() {
  const searchParams = useSearchParams();
  const userName = searchParams.get("name") || "Kid";
  const audioPath = searchParams.get("audio") || "";

  // Use our proxy API route to avoid CORS issues
  // The proxy will fetch from media.melodia-songs.com and serve with proper CORS headers
  const audioUrl = audioPath ? `/api/christmas-audio/${audioPath}` : undefined;

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
    audioUrl,
    songTitle: `Christmas Wishes for ${userName}`,
    songId: `christmas-${userName}`,
    skipPlayTracking: true, // Skip tracking for Christmas messages
  });

  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (audioError) {
      setShowError(true);
    }
  }, [audioError]);

  // Handle slider change
  const handleSliderChange = (value: number[]) => {
    if (value[0] !== undefined && !isNaN(value[0])) {
      seekTo(value[0]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-green-50 to-red-50 flex flex-col">
      <div className="hidden md:block"><Header /></div>

      <main className="flex-1 flex items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* Animated snowflakes background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => {
            // Use deterministic pseudo-random based on index to avoid hydration mismatch
            // Simple hash function for consistent values between server and client
            const hash = (i * 9301 + 49297) % 233280;
            const normalized = hash / 233280;

            const left = (normalized * 100) % 100;
            const top = (normalized * 137.5) % 100;
            const delay = normalized * 5;
            const duration = 3 + normalized * 4;

            return (
              <div
                key={i}
                className="absolute text-white/30 text-2xl animate-float"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  animationDelay: `${delay}s`,
                  animationDuration: `${duration}s`,
                }}
              >
                ❄️
              </div>
            );
          })}
        </div>

        <div className="relative z-10 max-w-2xl w-full">
          {/* Main Card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-12 border-4 border-red-200">
            {/* Christmas Header */}
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎄</div>
              <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-green-600 to-red-600 mb-4">
                Merry Christmas!
              </h1>
              <p className="text-2xl md:text-3xl text-gray-700 font-semibold">
                {userName}
              </p>
            </div>

            {/* Personalized Message */}
            <div className="text-center mb-8">
              <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
                Wishing you and your loved ones a season filled with joy, peace,
                and beautiful memories. May this Christmas bring you happiness
                that lasts throughout the year!
              </p>
            </div>

            {/* Audio Player Section */}
            {audioPath && (
              <div className="mt-10 space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">
                    🎵 Your Special Christmas Message
                  </h2>
                </div>

                {/* Audio Player */}
                <div className="bg-gradient-to-r from-red-50 to-green-50 rounded-2xl p-6 border-2 border-red-100">
                  {/* Error Message */}
                  {showError && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-red-800 font-medium">
                          Unable to load audio message
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          Please check if the audio file URL is correct and
                          accessible.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Loading State */}
                  {(isLoading || isPlayLoading) && !audioError && (
                    <div className="mb-4 flex items-center justify-center gap-2 text-gray-600">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm">Loading your message...</span>
                    </div>
                  )}

                  {/* Audio Controls */}
                  <div className="space-y-4">
                    {/* Progress Slider */}
                    {duration > 0 && (
                      <div className="space-y-2">
                        <Slider
                          value={[currentTime]}
                          max={duration || 100}
                          step={0.1}
                          onValueChange={handleSliderChange}
                          className="w-full"
                          disabled={audioError}
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                      </div>
                    )}

                    {/* Control Buttons */}
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => skipTime(-10)}
                        disabled={audioError || !audioUrl}
                        className="rounded-full w-12 h-12 border-2 border-red-300 hover:bg-red-50"
                      >
                        <Rewind className="w-5 h-5 text-red-600" />
                      </Button>

                      <Button
                        onClick={togglePlay}
                        disabled={audioError || (!audioUrl && !isLoading)}
                        className="rounded-full w-16 h-16 bg-gradient-to-r from-red-600 to-green-600 hover:from-red-700 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all"
                      >
                        {isPlayLoading ? (
                          <Loader2 className="w-8 h-8 animate-spin" />
                        ) : isPlaying ? (
                          <Pause className="w-8 h-8" />
                        ) : (
                          <Play className="w-8 h-8 ml-1" />
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => skipTime(10)}
                        disabled={audioError || !audioUrl}
                        className="rounded-full w-12 h-12 border-2 border-green-300 hover:bg-green-50"
                      >
                        <FastForward className="w-5 h-5 text-green-600" />
                      </Button>
                    </div>
                  </div>

                  {/* Hidden Audio Element */}
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    preload="metadata"
                    crossOrigin="anonymous"
                  />
                </div>
              </div>
            )}

            {/* No Audio Path Message */}
            {!audioPath && (
              <div className="mt-8 p-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg text-center">
                <p className="text-yellow-800 font-medium">
                  No audio message found. Please provide an audio path in the
                  query parameters.
                </p>
                <p className="text-sm text-yellow-600 mt-2">
                  Format: /christmas?name=John&audio=john-christmas.mp3
                </p>
              </div>
            )}

            {/* Christmas Decoration */}
            <div className="mt-8 text-center">
              <div className="flex justify-center gap-2 text-2xl">
                <span>✨</span>
                <span>🎁</span>
                <span>🌟</span>
              </div>
            </div>
          </div>

          {/* Share Message */}
          <div className="mt-6 text-center text-gray-600 text-sm">
            <p>Share this special message with your loved ones!</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ChristmasPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        </div>
      }
    >
      <ChristmasContent />
    </Suspense>
  );
}
