"use client";

import { useState } from "react";
import Image from "next/image";
import { Music } from "lucide-react";
import { PlayingGlowLayers } from "./PlayingGlowLayers";

interface SongThumbnailProps {
  imageUrl: string | null;
  title: string;
  isPlaying: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function SongThumbnail({
  imageUrl,
  title,
  isPlaying,
  className = "",
  size = "lg",
}: SongThumbnailProps) {
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    sm: "w-32 h-32 sm:w-32 sm:h-32",
    md: "w-32 h-32 sm:w-40 sm:h-40 md:w-64 md:h-64",
    lg: "w-40 h-40 sm:w-48 sm:h-48 md:w-80 md:h-80",
  };

  return (
    <div className={`relative inline-block group ${className}`}>
      <div
        className={`${sizeClasses[size]} mx-auto relative rounded-full shadow-2xl overflow-hidden border-[4px] md:border-[8px] border-white bg-white z-10 transition-transform duration-700 ease-out transform group-hover:scale-105`}
      >
        {imageUrl && !hasError ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-700 hover:scale-105"
            priority
            onError={() => setHasError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-yellow to-yellow-400 flex items-center justify-center">
            <Music className="h-24 w-24 md:h-32 md:w-32 text-text-teal opacity-20" />
          </div>
        )}

        {/* Vinyl Texture Overlay */}
        <div className="absolute inset-0 rounded-full bg-[url('/images/vinyl-texture.png')] opacity-20 pointer-events-none mix-blend-overlay"></div>

        {/* Shiny Reflection */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none"></div>
      </div>

      <PlayingGlowLayers active={isPlaying} className="-z-10" />
    </div>
  );
}
