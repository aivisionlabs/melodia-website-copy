"use client";
import { Music } from "lucide-react";

export const SongArtwork = ({ className = "" }: { className?: string }) => (
  <div
    className={`relative w-full h-full mx-auto rounded-xl overflow-hidden shadow-lg flex items-center justify-center bg-gradient-to-br from-primary-yellow/80 to-accent-coral/80 ${className}`}
  >
    <Music className="w-1/2 h-1/2 text-white/50" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
  </div>
);
