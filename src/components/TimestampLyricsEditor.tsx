"use client";

import { useState, useEffect } from "react";
import { updateTimestampLyricsAction } from "@/lib/actions/song.actions";
import { X, Save, AlertCircle, CheckCircle2 } from "lucide-react";

interface LyricLine {
  index: number;
  text: string;
  start: number;
  end: number;
}

interface TimestampLyricsEditorProps {
  songId: number;
  slug: string;
  timestampLyrics: LyricLine[] | null;
  plainLyrics: string | null;
  onSave: () => void;
  onCancel: () => void;
}

export default function TimestampLyricsEditor({
  songId,
  slug,
  timestampLyrics,
  plainLyrics,
  onSave,
  onCancel,
}: TimestampLyricsEditorProps) {
  const [jsonText, setJsonText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isValidJson, setIsValidJson] = useState(true);

  // Initialize with existing timestamp_lyrics data
  useEffect(() => {
    if (timestampLyrics) {
      setJsonText(JSON.stringify(timestampLyrics, null, 2));
    } else {
      setJsonText("[]");
    }
  }, [timestampLyrics]);

  // Validate JSON format
  const validateJson = (text: string): boolean => {
    try {
      const parsed = JSON.parse(text);

      // Check if it's an array
      if (!Array.isArray(parsed)) {
        setJsonError("JSON must be an array");
        return false;
      }

      // Validate each item in the array
      for (let i = 0; i < parsed.length; i++) {
        const line = parsed[i];
        if (!line || typeof line !== "object") {
          setJsonError(
            `Invalid format at index ${i}: each item must be an object`
          );
          return false;
        }

        // Check for required fields
        if (typeof line.index !== "number") {
          setJsonError(
            `Invalid format at index ${i}: 'index' must be a number`
          );
          return false;
        }

        if (typeof line.text !== "string") {
          setJsonError(`Invalid format at index ${i}: 'text' must be a string`);
          return false;
        }

        if (typeof line.start !== "number") {
          setJsonError(
            `Invalid format at index ${i}: 'start' must be a number`
          );
          return false;
        }

        if (typeof line.end !== "number") {
          setJsonError(`Invalid format at index ${i}: 'end' must be a number`);
          return false;
        }

        // Validate that end is greater than start
        if (line.end <= line.start) {
          setJsonError(
            `Invalid format at index ${i}: 'end' must be greater than 'start'`
          );
          return false;
        }
      }

      setJsonError(null);
      return true;
    } catch (e) {
      setJsonError("Invalid JSON format");
      return false;
    }
  };

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setJsonText(newText);
    validateJson(newText);
  };

  const handleSave = async () => {
    setError(null);

    // Validate JSON first
    if (!validateJson(jsonText)) {
      return;
    }

    setIsSaving(true);

    try {
      const parsedJson = JSON.parse(jsonText);
      const result = await updateTimestampLyricsAction(songId, parsedJson);

      if (result.success) {
        onSave();
      } else {
        setError(result.error || "Failed to save timestamp lyrics");
      }
    } catch (e: any) {
      setError(e.message || "An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Edit Timestamp Lyrics
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Edit the JSON on the left, preview the lyrics on the right
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Error Message */}
        {(error || jsonError) && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-md p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">
                {jsonError ? "Invalid JSON Format" : "Error"}
              </h3>
              <div className="mt-1 text-sm text-red-700">
                {jsonError || error}
              </div>
            </div>
          </div>
        )}

        {/* Content - Split View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Side - JSON Editor */}
          <div className="flex-1 flex flex-col border-r border-gray-200">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Timestamp Lyrics (JSON)
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Format: Array of objects with index, text, start, and end fields
              </p>
            </div>
            <div className="flex-1 overflow-auto">
              <textarea
                value={jsonText}
                onChange={handleJsonChange}
                className="w-full h-full p-6 font-mono text-sm border-0 focus:outline-none focus:ring-0 resize-none"
                placeholder="Edit the JSON here..."
              />
            </div>
          </div>

          {/* Right Side - Lyrics Preview */}
          <div className="flex-1 flex flex-col">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Lyrics Preview
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Preview of plain lyrics text
              </p>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {plainLyrics ? (
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                  {plainLyrics}
                </pre>
              ) : (
                <div className="text-gray-500 text-sm">No lyrics available</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {jsonError ? (
              <span className="text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                Invalid JSON - Please fix the errors above
              </span>
            ) : (
              <span className="text-green-600 flex items-center">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Valid JSON
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onCancel}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !!jsonError}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

