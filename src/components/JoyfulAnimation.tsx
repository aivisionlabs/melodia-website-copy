"use client";

import { useState, useEffect } from "react";

interface JoyfulAnimationProps {
  show: boolean;
}

interface ConfettiItem {
  left: number;
  animationDelay: number;
  animationDuration: number;
  isStar: boolean;
}

export default function JoyfulAnimation({ show }: JoyfulAnimationProps) {
  const [confettiItems, setConfettiItems] = useState<ConfettiItem[]>([]);

  // Generate random values only on client side to avoid hydration mismatch
  useEffect(() => {
    if (show) {
      const items: ConfettiItem[] = Array.from({ length: 30 }, () => ({
        left: Math.random() * 100,
        animationDelay: Math.random() * 2,
        animationDuration: 2 + Math.random() * 2,
        isStar: Math.random() > 0.5,
      }));
      setConfettiItems(items);
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      {/* Dark backdrop overlay to prevent mixing with content */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

      {/* Animated background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#EF476F]/30 via-[#FFD166]/30 to-[#06D6A0]/30 animate-pulse"></div>

      <div className="flex flex-col items-center relative z-10">
        {/* Floating hearts and stars */}
        <div className="absolute inset-0 overflow-hidden">
          {confettiItems.map((item, i) => (
            <div
              key={`confetti-${i}`}
              className="absolute animate-float-up"
              style={{
                left: `${item.left}%`,
                bottom: "-10%",
                animationDelay: `${item.animationDelay}s`,
                animationDuration: `${item.animationDuration}s`,
              }}
            >
              {item.isStar ? (
                <span className="text-3xl animate-spin-slow">✨</span>
              ) : (
                <span className="text-4xl animate-bounce">💖</span>
              )}
            </div>
          ))}
        </div>

        {/* Main celebration element */}
        <div className="relative">
          {/* Pulsing heart */}
          <div className="text-8xl animate-scale-bounce">
            <span className="inline-block animate-bounce">💝</span>
          </div>

          {/* Rotating stars around heart */}
          <div className="absolute inset-0 flex items-center justify-center">
            {[...Array(8)].map((_, i) => (
              <div
                key={`star-${i}`}
                className="absolute animate-spin-slow text-2xl"
                style={{
                  transform: `rotate(${i * 45}deg) translateY(-60px)`,
                  animationDuration: "3s",
                  animationDelay: `${i * 0.2}s`,
                }}
              >
                ⭐
              </div>
            ))}
          </div>
        </div>

        {/* Success message */}
        <div className="mt-8 text-center">
          <p className="text-3xl font-bold text-white drop-shadow-lg animate-fade-in-up mb-2">
            Amazing Choice! 🎉
          </p>
          <p className="text-xl text-white drop-shadow-md animate-fade-in-up-delay">
            Your song is ready to download!
          </p>
        </div>
      </div>
    </div>
  );
}
