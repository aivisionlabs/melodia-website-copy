"use client";

import { useEffect, useState } from "react";
import UserSongCard from "./UserSongCard";

interface UserSong {
  id: number;
  slug: string;
  title: string;
  status: string;
  created_at: Date | string;
  recipient_details: string;
  occasion: string | null;
  languages: string;
  user: {
    id: number;
    name: string;
    email: string;
  } | null;
  is_anonymous: boolean;
  variant_count: number;
  music_style: string | null;
  selected_variant?: number | null;
  variant_audio_urls?: Array<string | null>;
  is_converted_to_library?: boolean;
  play_count?: number;
  payment_id: string | null;
  order_id: string | null;
  feedback?: Array<{
    id: number;
    variant_index: number;
    accepted: boolean;
    rating: number | null;
    reason_labels: string[];
    other_text: string | null;
    selected: boolean;
    created_at: Date | string;
  }>;
}

interface UserSongListProps {
  songs: UserSong[];
}

export default function UserSongList({ songs = [] }: UserSongListProps) {
  if (songs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No user songs found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {songs.map((song) => (
        <UserSongCard key={song.id} song={song} />
      ))}
    </div>
  );
}
