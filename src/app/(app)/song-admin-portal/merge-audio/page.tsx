"use client";

import { useState, useEffect, useRef } from "react";
import {
  Music,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { mergeAudioFiles } from "@/lib/utils/audio-merge";

interface Song {
  id: number;
  title: string;
  slug: string;
  audioUrl: string;
  createdAt: string;
}

type AudioSource = {
  type: "file" | "database";
  file?: File;
  song?: Song;
  name: string;
};

export default function MergeAudioPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [audioSource1, setAudioSource1] = useState<AudioSource | null>(null);
  const [audioSource2, setAudioSource2] = useState<AudioSource | null>(null);
  const [selectedSong1, setSelectedSong1] = useState<Song | null>(null);
  const [selectedSong2, setSelectedSong2] = useState<Song | null>(null);
  const [uploadedFile1, setUploadedFile1] = useState<File | null>(null);
  const [uploadedFile2, setUploadedFile2] = useState<File | null>(null);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(0);
  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/merge-audio/songs");
      const data = await response.json();

      if (data.success) {
        setSongs(data.songs);
      } else {
        setError("Failed to load songs");
      }
    } catch (err) {
      console.error("Error fetching songs:", err);
      setError("Failed to load songs");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload1 = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("audio/")) {
        setError("Please select a valid audio file");
        return;
      }
      setUploadedFile1(file);
      setSelectedSong1(null);
      setAudioSource1({
        type: "file",
        file,
        name: file.name,
      });
    }
  };

  const handleFileUpload2 = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("audio/")) {
        setError("Please select a valid audio file");
        return;
      }
      setUploadedFile2(file);
      setSelectedSong2(null);
      setAudioSource2({
        type: "file",
        file,
        name: file.name,
      });
    }
  };

  const handleSongSelect1 = (songId: string) => {
    if (songId) {
      const song = songs.find((s) => s.id === Number(songId));
      if (song) {
        setSelectedSong1(song);
        setUploadedFile1(null);
        setAudioSource1({
          type: "database",
          song,
          name: song.title,
        });
        if (fileInput1Ref.current) {
          fileInput1Ref.current.value = "";
        }
      }
    } else {
      setSelectedSong1(null);
      setUploadedFile1(null);
      setAudioSource1(null);
    }
  };

  const handleSongSelect2 = (songId: string) => {
    if (songId) {
      const song = songs.find((s) => s.id === Number(songId));
      if (song) {
        setSelectedSong2(song);
        setUploadedFile2(null);
        setAudioSource2({
          type: "database",
          song,
          name: song.title,
        });
        if (fileInput2Ref.current) {
          fileInput2Ref.current.value = "";
        }
      }
    } else {
      setSelectedSong2(null);
      setUploadedFile2(null);
      setAudioSource2(null);
    }
  };

  const clearAudio1 = () => {
    // Clean up object URLs if they exist
    if (uploadedFile1) {
      const url = URL.createObjectURL(uploadedFile1);
      URL.revokeObjectURL(url);
    }
    setSelectedSong1(null);
    setUploadedFile1(null);
    setAudioSource1(null);
    if (fileInput1Ref.current) {
      fileInput1Ref.current.value = "";
    }
  };

  const clearAudio2 = () => {
    // Clean up object URLs if they exist
    if (uploadedFile2) {
      const url = URL.createObjectURL(uploadedFile2);
      URL.revokeObjectURL(url);
    }
    setSelectedSong2(null);
    setUploadedFile2(null);
    setAudioSource2(null);
    if (fileInput2Ref.current) {
      fileInput2Ref.current.value = "";
    }
  };

  const handleMerge = async () => {
    if (!audioSource1 || !audioSource2) {
      setError("Please select or upload both audio files");
      return;
    }

    // Check if both sources are from database and are the same
    if (audioSource1.type === "database" && audioSource2.type === "database") {
      if (audioSource1.song?.id === audioSource2.song?.id) {
        setError("Please select two different audio files");
        return;
      }
    }

    // Validate file types before merging
    if (audioSource1.type === "file" && audioSource1.file) {
      if (!audioSource1.file.type.startsWith("audio/")) {
        setError(
          "First file is not a valid audio file. Please select an audio file (MP3, WAV, OGG, etc.)."
        );
        return;
      }
    }
    if (audioSource2.type === "file" && audioSource2.file) {
      if (!audioSource2.file.type.startsWith("audio/")) {
        setError(
          "Second file is not a valid audio file. Please select an audio file (MP3, WAV, OGG, etc.)."
        );
        return;
      }
    }

    try {
      setMerging(true);
      setError(null);
      setSuccess(false);
      setMergeProgress(0);

      // Get audio sources (File or URL)
      const source1 =
        audioSource1.type === "file"
          ? audioSource1.file!
          : audioSource1.song!.audioUrl;
      const source2 =
        audioSource2.type === "file"
          ? audioSource2.file!
          : audioSource2.song!.audioUrl;

      // Merge audio files client-side using Web Audio API
      const mergedBlob = await mergeAudioFiles({
        audioUrl1: source1,
        audioUrl2: source2,
        onProgress: (progress) => {
          setMergeProgress(progress);
        },
      });

      // Download the merged file
      const url = window.URL.createObjectURL(mergedBlob);
      const a = document.createElement("a");
      const fileName1 = audioSource1.name.replace(/[^a-z0-9]/gi, "_");
      const fileName2 = audioSource2.name.replace(/[^a-z0-9]/gi, "_");
      a.href = url;
      a.download = `merged-${fileName1}-${fileName2}-${Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(true);
      setMergeProgress(100);
      setTimeout(() => {
        setSuccess(false);
        setMergeProgress(0);
      }, 3000);
    } catch (err: any) {
      console.error("Error merging audio:", err);
      setError(
        err.message ||
          "Failed to merge audio files. Make sure the audio files are accessible and in a supported format."
      );
      setMergeProgress(0);
    } finally {
      setMerging(false);
    }
  };

  const swapSongs = () => {
    const temp1 = audioSource1;
    const temp2 = audioSource2;
    setAudioSource1(temp2);
    setAudioSource2(temp1);

    const tempSong1 = selectedSong1;
    const tempSong2 = selectedSong2;
    setSelectedSong1(tempSong2);
    setSelectedSong2(tempSong1);

    const tempFile1 = uploadedFile1;
    const tempFile2 = uploadedFile2;
    setUploadedFile1(tempFile2);
    setUploadedFile2(tempFile1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Merge Audio Files</h1>
        <p className="mt-2 text-sm text-gray-600">
          Upload two audio files from your computer or select from the database
          to merge them together in sequence. Merging happens entirely in your
          browser - no server processing required.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600"
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-start">
          <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-sm text-green-800">
            Audio files merged and downloaded successfully!
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* First Audio Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Music className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">
                Audio File 1
              </h2>
            </div>
            {audioSource1 && (
              <button
                onClick={clearAudio1}
                className="text-gray-400 hover:text-gray-600"
                title="Clear selection"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* File Upload */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload from file system
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInput1Ref}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload1}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>

          {/* Database Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or select from database
            </label>
            <select
              value={selectedSong1?.id || ""}
              onChange={(e) => handleSongSelect1(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select from database...</option>
              {songs.map((song) => (
                <option key={song.id} value={song.id}>
                  {song.title} (ID: {song.id})
                </option>
              ))}
            </select>
          </div>

          {/* Preview */}
          {audioSource1 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-900">
                {audioSource1.name}
              </p>
              {audioSource1.type === "file" && (
                <p className="text-xs text-gray-500 mt-1">
                  File: {(audioSource1.file!.size / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
              {audioSource1.type === "database" && (
                <p className="text-xs text-gray-500 mt-1">
                  ID: {audioSource1.song!.id}
                </p>
              )}
              {audioSource1.type === "file" && (
                <audio
                  controls
                  src={URL.createObjectURL(audioSource1.file!)}
                  className="w-full mt-2"
                >
                  Your browser does not support the audio element.
                </audio>
              )}
              {audioSource1.type === "database" &&
                audioSource1.song!.audioUrl && (
                  <audio
                    controls
                    src={audioSource1.song!.audioUrl}
                    className="w-full mt-2"
                  >
                    Your browser does not support the audio element.
                  </audio>
                )}
            </div>
          )}
        </div>

        {/* Second Audio Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Music className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">
                Audio File 2
              </h2>
            </div>
            {audioSource2 && (
              <button
                onClick={clearAudio2}
                className="text-gray-400 hover:text-gray-600"
                title="Clear selection"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* File Upload */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload from file system
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInput2Ref}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload2}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>

          {/* Database Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or select from database
            </label>
            <select
              value={selectedSong2?.id || ""}
              onChange={(e) => handleSongSelect2(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select from database...</option>
              {songs
                .filter((song) => song.id !== selectedSong1?.id)
                .map((song) => (
                  <option key={song.id} value={song.id}>
                    {song.title} (ID: {song.id})
                  </option>
                ))}
            </select>
          </div>

          {/* Preview */}
          {audioSource2 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-900">
                {audioSource2.name}
              </p>
              {audioSource2.type === "file" && (
                <p className="text-xs text-gray-500 mt-1">
                  File: {(audioSource2.file!.size / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
              {audioSource2.type === "database" && (
                <p className="text-xs text-gray-500 mt-1">
                  ID: {audioSource2.song!.id}
                </p>
              )}
              {audioSource2.type === "file" && (
                <audio
                  controls
                  src={URL.createObjectURL(audioSource2.file!)}
                  className="w-full mt-2"
                >
                  Your browser does not support the audio element.
                </audio>
              )}
              {audioSource2.type === "database" &&
                audioSource2.song!.audioUrl && (
                  <audio
                    controls
                    src={audioSource2.song!.audioUrl}
                    className="w-full mt-2"
                  >
                    Your browser does not support the audio element.
                  </audio>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Merge Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Merge Sequence
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Audio 1 will play first, followed by Audio 2
            </p>
          </div>
          {audioSource1 && audioSource2 && (
            <button
              onClick={swapSongs}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Swap Order
            </button>
          )}
        </div>

        {audioSource1 && audioSource2 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-200">
            <p className="text-sm text-gray-700">
              <span className="font-medium">1.</span> {audioSource1.name}
            </p>
            <p className="text-sm text-gray-700 mt-1">
              <span className="font-medium">2.</span> {audioSource2.name}
            </p>
          </div>
        )}

        {merging && mergeProgress > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Merging audio files...</span>
              <span>{mergeProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${mergeProgress}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={handleMerge}
          disabled={!audioSource1 || !audioSource2 || merging}
          className="mt-6 w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {merging ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Merging...
            </>
          ) : (
            <>
              <Download className="h-5 w-5" />
              Merge & Download
            </>
          )}
        </button>
      </div>

      {songs.length === 0 && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-sm text-yellow-800">
            No songs with audio URLs found. Please ensure songs have been
            generated with audio files.
          </p>
        </div>
      )}
    </div>
  );
}
