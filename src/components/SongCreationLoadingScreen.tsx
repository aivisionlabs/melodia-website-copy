"use client";

import { useEffect, useMemo, useState } from "react";

const EXTENDED_MESSAGES = {
  lyrics:
    "We're taking a bit more time to perfect your lyrics. Thanks for your patience!",
  song: "We're taking a bit more time to perfect your song. Thanks for your patience!",
} as const;

/** Short rotating lines so the wait feels lighter — lyrics / words / emotion */
const LYRICS_ONE_LINERS: readonly string[] = [
  "The best songs start with a truth only you could tell.",
  "We're weaving your words into lines worth singing.",
  "Every great lyric began as a feeling someone cared enough to write down.",
  "Rhyme is optional; heart isn't.",
  "Your story is finding its rhythm, one line at a time.",
  "Poetry plus heart is what makes lyrics land.",
  "Good lyrics take a breath — we're giving yours room to shine.",
];

/** Music, gifting, and the magic of a song made for someone */
const SONG_ONE_LINERS: readonly string[] = [
  "Your feelings are becoming chords and melodies.",
  "A personalized song is a memory you can replay forever.",
  "Somewhere, your story is turning into sound.",
  "Patience for a moment — magic takes a little time to mix.",
  "Music turns 'I love you' into something you can hear again tomorrow.",
  "The best gifts don't need wrapping — just a play button.",
  "People have sung to celebrate for centuries — you're keeping that alive.",
  "A song made for someone is a hug that fits in your pocket.",
];

const TIP_ROTATE_MS = 6500;

interface SongCreationLoadingScreenProps {
  duration?: number; // Duration in seconds, default 45
  title?: string; // Custom title
  message?: string; // Custom message
  showTimer?: boolean; // Whether to show timer, default true
  stage?: "lyrics" | "song"; // Whether we're generating lyrics or song (for extended-wait message)
}

export default function SongCreationLoadingScreen({
  duration = 60,
  title = "Crafting your song...",
  message = "We are turning your story into a musical masterpiece. Hang tight!",
  showTimer = true,
  stage = "song",
}: SongCreationLoadingScreenProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isExtendedWait, setIsExtendedWait] = useState(false);

  const tips = useMemo(
    () => (stage === "lyrics" ? LYRICS_ONE_LINERS : SONG_ONE_LINERS),
    [stage],
  );
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (tips.length === 0) return;
    setTipIndex(Math.floor(Math.random() * tips.length));
  }, [stage, tips.length]);

  useEffect(() => {
    if (tips.length <= 1) return;
    const id = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, TIP_ROTATE_MS);
    return () => clearInterval(id);
  }, [tips.length]);

  // Timer effect: when timer hits 0, reset and show extended-wait message
  useEffect(() => {
    if (!showTimer) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsExtendedWait(true);
          return duration; // Reset timer
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showTimer, duration]);

  return (
    <div className="min-h-screen bg-secondary-cream flex flex-col items-center justify-center px-6 font-body">
      {/* Animated music notes */}
      <div className="flex items-end gap-2 mb-8">
        {[0.0, 0.15, 0.3, 0.45, 0.3, 0.15].map((delay, i) => (
          <div
            key={i}
            className="bg-accent-coral rounded-full animate-bounce"
            style={{
              width: i === 2 || i === 3 ? "10px" : "8px",
              height: i === 2 || i === 3 ? "40px" : "28px",
              animationDelay: `${delay}s`,
              animationDuration: "1s",
            }}
          />
        ))}
      </div>

      {/* Timer ring */}
      {showTimer && (
        <div className="relative mb-8">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 96 96">
            <circle
              cx="48"
              cy="48"
              r="42"
              stroke="currentColor"
              strokeWidth="5"
              fill="none"
              className="text-gray-200"
            />
            <circle
              cx="48"
              cy="48"
              r="42"
              stroke="currentColor"
              strokeWidth="5"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - (duration - timeLeft) / duration)}`}
              className="text-accent-coral transition-all duration-1000 ease-linear"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-text-teal font-heading">
              {timeLeft}
            </span>
          </div>
        </div>
      )}

      {/* Text */}
      <div className="text-center max-w-xs w-full">
        <h2 className="text-xl font-bold font-heading text-text-teal mb-2">
          {title}
        </h2>
        <p className="text-sm text-text-teal/55 leading-relaxed">
          {isExtendedWait ? EXTENDED_MESSAGES[stage] : message}
        </p>
        {tips.length > 0 && (
          <div className="mt-6 max-w-sm mx-auto min-h-[3.75rem] flex items-center justify-center border-t border-text-teal/10 pt-5 px-1">
            <p
              key={tipIndex}
              className="text-sm text-text-teal/70 leading-relaxed italic text-center [text-wrap:balance]"
            >
              &ldquo;{tips[tipIndex]}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* Pulsing dots */}
      <div className="flex gap-2 mt-8">
        {[0, 0.3, 0.6].map((delay, i) => (
          <div
            key={i}
            className="w-2 h-2 bg-accent-coral/60 rounded-full animate-pulse"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </div>
    </div>
  );
}
