"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, Heart } from "lucide-react";
import { useRouter } from "next/navigation";

interface ApologyScreenProps {
  onBack?: () => void;
}

export default function ApologyScreen({ onBack }: ApologyScreenProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col h-screen bg-secondary-cream text-text-teal">
      <header className="flex items-center justify-between p-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft size={24} className="text-text-teal" />
        </button>
        <h1 className="font-heading font-bold text-lg text-text-teal"></h1>
        <div className="w-8"></div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center px-6 text-center">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Illustration */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Outer circle with gradient */}
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-accent-coral/20 to-primary-yellow/20 rounded-full flex items-center justify-center shadow-lg animate-bounce-gentle">
                {/* Inner circle */}
                <div className="w-24 h-24 bg-gradient-to-br from-accent-coral/30 to-primary-yellow/30 rounded-full flex items-center justify-center">
                  <Heart
                    className="w-12 h-12 text-accent-coral fill-accent-coral/20"
                    strokeWidth={2}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-3">
            <h2 className="text-3xl font-heading font-bold text-text-teal">
              We&apos;re Sorry
            </h2>
            <p className="text-lg font-body text-text-teal/80 leading-relaxed">
              We couldn&apos;t meet your expectations this time, and we truly
              apologize for that.
            </p>
          </div>

          {/* Message */}
          <div className="space-y-4">
            <p className="text-base font-body text-text-teal/70 leading-relaxed">
              Your feedback is incredibly valuable to us and has been captured.
              We&apos;re committed to improving our service and making your
              experience better.
            </p>
            <p className="text-base font-body text-text-teal/70 leading-relaxed">
              Thank you for giving us a chance. You can still access all your
              songs from the My Songs page.
            </p>
          </div>

          {/* CTA to My Songs */}
          <div className="pt-6">
            <Button
              onClick={() => router.push("/my-songs")}
              size="lg"
              className="w-full h-14 bg-primary-yellow hover:bg-primary-yellow/90 text-text-teal font-heading font-bold text-lg rounded-full shadow-md hover:shadow-lg transition-all duration-300"
            >
              Go to My Songs
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
