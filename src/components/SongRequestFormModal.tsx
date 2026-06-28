/**
 * Song Request Form Modal Component
 * Modal for creating a new song request from anywhere in the app
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { X, Loader2, Music } from "lucide-react";
import { useAnonymousUser } from "@/hooks/use-anonymous-user";

interface SongRequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SongRequestFormModal({
  isOpen,
  onClose,
}: SongRequestFormModalProps) {
  const router = useRouter();
  const { anonymousUserId } = useAnonymousUser();

  const [formData, setFormData] = useState({
    requesterName: "",
    recipientDetails: "",
    occasion: "",
    languages: "English",
    mood: [] as string[],
    songStory: "",
    email: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const moodOptions = [
    "Happy",
    "Romantic",
    "Upbeat",
    "Emotional",
    "Peaceful",
    "Energetic",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/create-song-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create song request");
      }

      // Redirect to lyrics generation page
      router.push(`/generate-lyrics/${data.requestId}`);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMood = (mood: string) => {
    setFormData((prev) => ({
      ...prev,
      mood: prev.mood.includes(mood)
        ? prev.mood.filter((m) => m !== mood)
        : [...prev.mood, mood],
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-text-teal transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="mb-6">
            <h2 className="text-3xl font-bold text-text-teal font-heading flex items-center">
              <Music className="w-8 h-8 mr-3 text-primary-yellow" />
              Create Your Song
            </h2>
            <p className="text-text-teal/70 mt-2">
              Tell us about your special moment and we&apos;ll create a unique
              song for you
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg">
              <p className="text-error text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <FormField
              id="requesterName"
              label="Your Name"
              type="text"
              placeholder="John Smith"
              value={formData.requesterName}
              onChange={(e) =>
                setFormData({ ...formData, requesterName: e.target.value })
              }
              required
            />

            <FormField
              id="recipientDetails"
              label="Who is this song for?"
              type="text"
              placeholder="Sarah Smith, my sister"
              value={formData.recipientDetails}
              onChange={(e) =>
                setFormData({ ...formData, recipientDetails: e.target.value })
              }
              helperText="Include name and relationship (e.g., 'John, my best friend')"
              required
            />

            <FormField
              id="occasion"
              label="Occasion"
              type="text"
              placeholder="Birthday, Wedding, Anniversary..."
              value={formData.occasion}
              onChange={(e) =>
                setFormData({ ...formData, occasion: e.target.value })
              }
            />

            {/* Mood Selection */}
            <div>
              <label className="block mb-2 font-heading font-semibold text-text-teal">
                Mood (Select all that apply)
              </label>
              <div className="flex flex-wrap gap-2">
                {moodOptions.map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => toggleMood(mood)}
                    className={`px-4 py-2 rounded-full border-2 transition-all ${
                      formData.mood.includes(mood)
                        ? "border-accent-coral bg-accent-coral text-white"
                        : "border-gray-300 text-text-teal hover:border-accent-coral"
                    }`}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>

            <FormField
              id="songStory"
              label="Tell us your story"
              placeholder="Share memories, special moments, or what makes this person unique..."
              value={formData.songStory}
              onChange={(e) =>
                setFormData({ ...formData, songStory: e.target.value })
              }
              isTextarea
              textareaProps={{ rows: 4 }}
              helperText="The more details you share, the more personalized your song will be"
            />

            <FormField
              id="email"
              label="Email (Optional)"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              helperText="We'll send you updates about your song"
            />

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary-yellow text-text-teal hover:bg-primary-yellow/90 font-bold py-6 text-lg mt-6"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating Request...
                </>
              ) : (
                "Create My Song"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

