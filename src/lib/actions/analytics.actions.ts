'use server'

import { incrementSongView, incrementSongPlay } from '../db/services';

// Analytics tracking actions
export async function trackSongView(songId: number) {
  try {
    await incrementSongView(songId);
  } catch (error) {
    console.error('Error tracking song view:', error);
  }
}

export async function trackSongPlay(songId: number) {
  try {
    await incrementSongPlay(songId);
  } catch (error) {
    console.error('Error tracking song play:', error);
  }
}
