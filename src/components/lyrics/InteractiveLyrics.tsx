"use client";

import { useState, useRef, useCallback } from "react";
import { X, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PendingChange {
  id: string;
  original: string;
  instruction: string;
}

interface InteractiveLyricsProps {
  lyrics: string;
  onAddChange: (original: string, instruction: string) => void;
  pendingChanges: PendingChange[];
}

export default function InteractiveLyrics({
  lyrics,
  onAddChange,
  pendingChanges,
}: InteractiveLyricsProps) {
  const [selectedLine, setSelectedLine] = useState<{
    index: number;
    text: string;
  } | null>(null);
  const [instruction, setInstruction] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const lines = lyrics.split("\n");

  const isSectionHeader = (line: string) =>
    line.startsWith("[") && line.endsWith("]");

  const openEdit = useCallback((index: number, text: string) => {
    setSelectedLine({ index, text });
    setInstruction("");
    setTimeout(() => textareaRef.current?.focus(), 150);
  }, []);

  const closeEdit = () => {
    setSelectedLine(null);
    setInstruction("");
  };

  const handleAdd = () => {
    if (!selectedLine || !instruction.trim()) return;
    onAddChange(selectedLine.text, instruction.trim());
    closeEdit();
  };

  const hasPendingChange = (lineText: string) =>
    pendingChanges.some((c) => c.original.includes(lineText));

  return (
    <>
      {/* Hint */}
      {!selectedLine && (
        <p className="text-xs text-gray-400 mb-3 text-center">
          Tap any line to edit it
        </p>
      )}

      {/* Lyrics rendered line by line */}
      <div className="space-y-0.5 min-w-0">
        {lines.map((line, index) => {
          const trimmed = line.trim();

          if (trimmed === "") {
            return <div key={index} className="h-3" />;
          }

          if (isSectionHeader(trimmed)) {
            return (
              <div
                key={index}
                className="font-semibold text-text-teal mt-5 mb-1 text-sm break-words"
              >
                {trimmed}
              </div>
            );
          }

          const isPending = hasPendingChange(trimmed);
          const isActive = selectedLine?.index === index;

          return (
            <p
              key={index}
              onClick={() => !selectedLine && openEdit(index, trimmed)}
              className={`
                text-sm leading-relaxed py-1.5 px-2 -mx-2 rounded-md cursor-pointer transition-colors duration-150 select-none break-words
                ${
                  isActive
                    ? "bg-accent-coral/15 text-text-teal ring-1 ring-accent-coral/40"
                    : isPending
                      ? "bg-primary-yellow/25 text-text-teal"
                      : "text-gray-600 hover:bg-gray-50 active:bg-gray-100"
                }
              `}
            >
              {trimmed}
              {isPending && (
                <span className="ml-1.5 text-[10px] text-accent-coral font-semibold align-middle">
                  ✦
                </span>
              )}
            </p>
          );
        })}
      </div>

      {/* Edit bottom sheet — opens immediately on line tap */}
      {selectedLine && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[55] bg-black/30 animate-in fade-in duration-200"
            onClick={closeEdit}
          />

          {/* Sheet — z-[60] so it appears above BottomTabBar (z-50) */}
          <div
            className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.14)] animate-in slide-in-from-bottom-4 duration-300"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="px-5 pb-6 pt-2">
              {/* Header */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-accent-coral/10 rounded-full flex items-center justify-center">
                    <Wand2 className="w-3.5 h-3.5 text-accent-coral" />
                  </div>
                  <h3 className="font-semibold text-text-teal text-base">
                    Edit this line
                  </h3>
                </div>
                <button
                  onClick={closeEdit}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Selected line preview */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mb-4">
                <p className="text-sm text-gray-500 italic leading-relaxed">
                  &ldquo;{selectedLine.text}&rdquo;
                </p>
              </div>

              {/* Instruction textarea */}
              <textarea
                ref={textareaRef}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder='e.g. "Make it more emotional" or "Use her name Priya here"'
                className="w-full h-20 p-3 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-accent-coral/20 focus:border-accent-coral transition-all"
                onFocus={() =>
                  setTimeout(
                    () =>
                      actionsRef.current?.scrollIntoView({
                        block: "end",
                        behavior: "smooth",
                      }),
                    400,
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />

              {/* Actions */}
              <div ref={actionsRef} className="flex gap-3 mt-3">
                <Button
                  variant="outline"
                  onClick={closeEdit}
                  className="flex-1 h-11 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={!instruction.trim()}
                  className="flex-1 h-11 bg-accent-coral hover:bg-accent-coral/90 text-white font-semibold rounded-xl gap-2"
                >
                  <Wand2 className="w-4 h-4" />
                  Apply Change
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
