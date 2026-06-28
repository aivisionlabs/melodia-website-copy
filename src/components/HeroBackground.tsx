"use client";

import React, { useEffect, useState } from "react";

interface FloatingItem {
  id: number;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  type: "note" | "sparkle";
  symbol: string;
}

const HeroBackground = () => {
  const [items, setItems] = useState<FloatingItem[]>([]);

  useEffect(() => {
    // Create random floating items only on client side
    const symbols = ["🎵", "🎶", "🎼", "✨", "🎹"];
    const newItems: FloatingItem[] = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100, // 0-100%
      top: Math.random() * 100, // 0-100%
      size: 10 + Math.random() * 20, // 10-30px
      duration: 15 + Math.random() * 20, // 15-35s
      delay: Math.random() * -20, // Start at different times
      type: Math.random() > 0.3 ? "note" : "sparkle",
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
    }));
    setItems(newItems);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {items.map((item) => (
        <div
          key={item.id}
          className="absolute animate-float opacity-20"
          style={{
            left: `${item.left}%`,
            top: `${item.top}%`,
            fontSize: `${item.size}px`,
            animationDuration: `${item.duration}s`,
            animationDelay: `${item.delay}s`,
            color: "#073B4C", // Text Teal with low opacity
          }}
        >
          {item.symbol}
        </div>
      ))}
      <style jsx>{`
        @keyframes float {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          20% {
            opacity: 0.2;
          }
          80% {
            opacity: 0.2;
          }
          100% {
            transform: translateY(-100vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-float {
          animation-name: float;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}</style>
    </div>
  );
};

export default HeroBackground;
