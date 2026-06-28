"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { trackCTAEvent } from "@/lib/analytics";
import { HeaderLogo } from "./OptimizedLogo";

const TAGLINES = [
  "Your life's moments, turned into songs",
  "Birthdays that hit different — in a song",
  "The perfect gift nobody else will give",
  "From your story to a song, in minutes",
  "Weddings, anniversaries, just because",
  "Make them cry happy tears — with music",
];

const HERO_VIDEO_MOBILE = "/media/melodia-hero-video.mp4";
const HERO_VIDEO_DESKTOP = "/media/melodia-hero-video-desktop.mp4";

export default function HeroVideoSection() {
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState<"idle" | "exit" | "enter">("idle");
  const nextRef = useRef(1);

  useEffect(() => {
    const interval = setInterval(() => {
      nextRef.current = (current + 1) % TAGLINES.length;
      setPhase("exit");

      setTimeout(() => {
        setCurrent(nextRef.current);
        setPhase("enter");
        setTimeout(() => setPhase("idle"), 900);
      }, 650);
    }, 3200);
    return () => clearInterval(interval);
  }, [current]);

  const getStyle = (): React.CSSProperties => {
    if (phase === "exit") {
      return {
        animation:
          "taglineSlideOut 0.65s cubic-bezier(0.4, 0, 0.2, 1) forwards",
      };
    }
    if (phase === "enter") {
      return {
        animation: "taglineSlideIn 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      };
    }
    return {};
  };

  return (
    <section
      className="relative w-full overflow-hidden bg-text-teal h-[75svh] md:h-[88svh]"
      style={{ minHeight: 480 }}
      aria-label="Melodia hero"
    >
      <style>{`
        @keyframes taglineSlideOut {
          0%   { transform: translateY(0)    ; opacity: 1; filter: blur(0px);   }
          100% { transform: translateY(-40px); opacity: 0; filter: blur(4px);   }
        }
        @keyframes taglineSlideIn {
          0%   { transform: translateY(48px) ; opacity: 0; filter: blur(6px);   }
          60%  { opacity: 1; filter: blur(0px); }
          100% { transform: translateY(0)    ; opacity: 1; filter: blur(0px);   }
        }
      `}</style>

      {/* Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover object-center"
        style={{ objectFit: "cover", objectPosition: "center center" }}
        aria-hidden="true"
      >
        <source
          src={HERO_VIDEO_DESKTOP}
          type="video/mp4"
          media="(min-width: 768px)"
        />
        <source src={HERO_VIDEO_MOBILE} type="video/mp4" />
      </video>

      {/* Top gradient — logo & nav readability on video */}
      <div
        className="absolute top-0 left-0 right-0 h-36 md:h-40 bg-gradient-to-b from-black/55 via-black/25 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* Bottom gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 h-3/5 bg-gradient-to-t from-black/75 via-black/40 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* Logo + desktop nav — overlaid on video (no separate header strip) */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 sm:px-6 md:px-8 lg:px-12 pt-3 md:pt-4 flex items-start justify-between gap-4">
        <Link href="/" className="shrink-0" aria-label="Go to homepage">
          <HeaderLogo
            alt="Melodia"
            className="!w-24 sm:!w-24 md:!w-28 lg:!w-32 drop-shadow-md"
          />
        </Link>
        <nav
          className="hidden md:flex flex-wrap items-center justify-end gap-x-4 gap-y-1 lg:gap-x-6 max-w-[min(100%,42rem)]"
          aria-label="Main navigation"
        >
          <Link
            href="/library"
            className="text-white/95 hover:text-primary-yellow font-medium transition-colors focus:underline font-body text-sm lg:text-base drop-shadow-md whitespace-nowrap"
            aria-label="Jump to Creations section"
          >
            Library
          </Link>
          <Link
            href="/occasions"
            className="text-white/95 hover:text-primary-yellow font-medium transition-colors focus:underline font-body text-sm lg:text-base drop-shadow-md whitespace-nowrap"
            aria-label="Occasions"
          >
            Occasions
          </Link>
          <Link
            href="/pricing"
            className="text-white/95 hover:text-primary-yellow font-medium transition-colors focus:underline font-body text-sm lg:text-base drop-shadow-md whitespace-nowrap"
            aria-label="Pricing"
          >
            Pricing
          </Link>
          <Link
            href="/my-songs"
            className="text-white/95 hover:text-primary-yellow font-medium transition-colors focus:underline font-body text-sm lg:text-base drop-shadow-md whitespace-nowrap"
            aria-label="My Songs"
          >
            My Songs
          </Link>
          <Link
            href="/contact"
            className="text-white/95 hover:text-primary-yellow font-medium transition-colors focus:underline font-body text-sm lg:text-base drop-shadow-md whitespace-nowrap"
            aria-label="Contact Us"
          >
            Contact Us
          </Link>
          <Link
            href="/pricing"
            className="bg-accent-coral hover:bg-accent-coral/90 text-white font-semibold text-sm lg:text-base px-4 py-2 rounded-lg shadow-elegant hover:shadow-glow transition-all duration-200 whitespace-nowrap"
            aria-label="Create Your Song"
            onClick={() =>
              trackCTAEvent.ctaClick("create_song_cta", "homepage_header", "button")
            }
          >
            Create Your Song
          </Link>
        </nav>
      </div>

      {/* Text + buttons */}
      <div className="absolute bottom-0 left-0 right-0 px-5 sm:px-6 md:px-8 lg:px-12 pb-8 md:pb-14 lg:pb-20 flex flex-col items-start gap-3 max-w-screen-2xl mx-auto">
        <div style={{ overflow: "hidden", paddingBottom: 4 }}>
          <h1
            key={current}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold font-heading text-primary-yellow leading-tight drop-shadow-lg"
            style={getStyle()}
          >
            {TAGLINES[current]}
          </h1>
        </div>
        <p className="text-white/80 text-sm sm:text-base md:text-lg font-body drop-shadow-md -mt-1">
          We create heartfelt, personalized songs for your loved ones, musically capturing emotions.
        </p>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/how-it-works"
            className="bg-white/15 backdrop-blur-md border border-white/35 text-white text-sm md:text-base font-semibold py-2.5 md:py-3 rounded-full hover:bg-white/25 transition-all duration-200 active:scale-95 font-body shadow-lg w-[130px] text-center"
            aria-label="How it works"
            onClick={() =>
              trackCTAEvent.ctaClick("hero_how_it_works", window.location.href)
            }
          >
            How it works
          </Link>
          <Link
            href="/pricing"
            className="bg-primary-yellow text-text-teal text-sm md:text-base font-bold py-2.5 md:py-3 rounded-full hover:bg-primary-yellow/90 transition-all duration-200 active:scale-95 font-body shadow-lg w-[130px] text-center"
            onClick={() =>
              trackCTAEvent.ctaClick("hero_pricing", window.location.href)
            }
          >
            Pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
