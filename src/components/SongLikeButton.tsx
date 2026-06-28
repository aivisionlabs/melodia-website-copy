"use client";

import { useCallback, useMemo, useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEngagementEvent } from "@/lib/analytics";

type Props = {
  slug: string;
  initialCount?: number;
  className?: string;
  size?: "sm" | "md";
  songTitle?: string;
  songId?: string;
  pageContext?: string;
};

function getStorageKey(slug: string) {
  return `melodia-liked-${slug}`;
}

export function SongLikeButton({
  slug,
  initialCount = 0,
  className = "",
  size = "md",
  songTitle = "",
  songId = "",
  pageContext = "unknown",
}: Props) {
  const [count, setCount] = useState<number>(initialCount);
  const [pending, setPending] = useState<boolean>(false);
  const [liked, setLiked] = useState<boolean>(() => {
    // Some in-app browsers (notably Instagram) can throw on localStorage access,
    // which would crash the whole page during initial render.
    if (typeof window === "undefined") return false;
    try {
      return !!window.localStorage?.getItem(getStorageKey(slug));
    } catch {
      return false;
    }
  });

  const handleLike = useCallback(async () => {
    if (pending) return;
    setPending(true);

    const isCurrentlyLiked = liked;
    const newLikedState = !isCurrentlyLiked;
    const newCount = isCurrentlyLiked ? count - 1 : count + 1;

    setLiked(newLikedState);
    setCount(newCount);

    try {
      if (newLikedState) {
        localStorage.setItem(getStorageKey(slug), "1");
      } else {
        localStorage.removeItem(getStorageKey(slug));
      }
    } catch {}

    try {
      const res = await fetch(`/api/song-likes/${encodeURIComponent(slug)}`, {
        method: newLikedState ? "POST" : "DELETE",
      });
      const data = await res.json();

      if (!data?.success) {
        // revert on server failure
        setLiked(isCurrentlyLiked);
        setCount(count);
        try {
          if (isCurrentlyLiked) {
            localStorage.setItem(getStorageKey(slug), "1");
          } else {
            localStorage.removeItem(getStorageKey(slug));
          }
        } catch {}
        console.error(
          `Failed to ${newLikedState ? "like" : "unlike"} song:`,
          data.error
        );
      } else {
        // Track successful like/unlike
        if (newLikedState) {
          trackEngagementEvent.like(
            songTitle || slug,
            songId || slug,
            pageContext,
            newCount
          );
        }
      }
    } catch (e) {
      setLiked(isCurrentlyLiked);
      setCount(count);
      try {
        if (isCurrentlyLiked) {
          localStorage.setItem(getStorageKey(slug), "1");
        } else {
          localStorage.removeItem(getStorageKey(slug));
        }
      } catch {}
      console.error(`Error ${newLikedState ? "liking" : "unliking"} song:`, e);
    } finally {
      setPending(false);
    }
  }, [liked, pending, slug, count, songTitle, songId, pageContext]);

  const sizeClasses = useMemo(
    () => (size === "sm" ? "py-1 px-2 text-xs" : "py-2 px-3 text-sm"),
    [size]
  );

  return (
    <Button
      type="button"
      onClick={handleLike}
      disabled={pending}
      className={`inline-flex items-center gap-2 bg-white/90 text-[var(--text-teal)] border border-[var(--border)] hover:bg-[var(--secondary-cream)] ${sizeClasses} ${className}`}
      aria-pressed={liked}
      aria-label={liked ? "Unlike" : "Like"}
    >
      <Heart
        className={`h-4 w-4 ${liked ? "fill-red-500 text-red-500" : ""}`}
      />
      <span>{count}</span>
    </Button>
  );
}
