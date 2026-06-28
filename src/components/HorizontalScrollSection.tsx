"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { trackNavigationEvent } from "@/lib/analytics";

interface HorizontalScrollSectionProps {
  title: string;
  subtitle?: string;
  seeAllHref?: string;
  seeAllLabel?: string;
  children: React.ReactNode;
  className?: string;
  /** px gap between cards */
  gap?: number;
  /**
   * Flex-wrap on md+. Use for sections where cards already have md:flex-1
   * (e.g. SocialProofRow).
   */
  wrapOnDesktop?: boolean;
  /**
   * CSS Grid on md+. Cards become full-width responsive grid cells.
   * Use for song / occasion sections.
   */
  desktopGrid?: boolean;
  /** Tailwind grid-cols classes for desktop, e.g. "md:grid-cols-4 lg:grid-cols-5" */
  desktopCols?: string;
  /** Called when user scrolls near the right end (mobile horizontal scroll only) */
  onNearEnd?: () => void;
}

export default function HorizontalScrollSection({
  title,
  subtitle,
  seeAllHref,
  seeAllLabel = "See all",
  children,
  className = "",
  gap = 12,
  wrapOnDesktop = false,
  desktopGrid = false,
  desktopCols = "md:grid-cols-4",
  onNearEnd,
}: HorizontalScrollSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!scrollRef.current || !onNearEnd) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    if (scrollWidth <= clientWidth) return;
    if (scrollWidth - scrollLeft - clientWidth < 250) {
      onNearEnd();
    }
  };

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: dir === "right"
        ? scrollRef.current.clientWidth * 0.8
        : -scrollRef.current.clientWidth * 0.8,
      behavior: "smooth",
    });
  };

  const trackClass = desktopGrid
    ? `flex items-start overflow-x-auto md:grid md:overflow-x-visible ${desktopCols} pl-4 sm:pl-5 md:pl-8 lg:pl-12 md:pr-8 lg:pr-12 scroll-pl-4 sm:scroll-pl-5`
    : wrapOnDesktop
      ? "flex items-start overflow-x-auto md:overflow-x-visible md:flex-wrap md:justify-start pl-4 sm:pl-5 md:pl-8 lg:pl-12 md:pr-8 lg:pr-12 scroll-pl-4 sm:scroll-pl-5"
      : "flex items-start overflow-x-auto pl-4 sm:pl-5 md:pl-8 lg:pl-12 scroll-pl-4 sm:scroll-pl-5";

  const showArrows = !wrapOnDesktop && !desktopGrid;

  return (
    <section className={`py-4 sm:py-5 md:py-7 ${className}`} aria-label={title}>
      {/* Section header */}
      <div className="flex items-center justify-between px-4 sm:px-5 md:px-8 lg:px-12 mb-3 md:mb-4 max-w-screen-2xl mx-auto">
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold font-heading text-text-teal leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-text-teal/60 text-xs sm:text-sm mt-0.5 font-body">
              {subtitle}
            </p>
          )}
        </div>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-accent-coral text-xs sm:text-sm md:text-base font-bold font-body hover:text-accent-coral/80 transition-colors flex-shrink-0 ml-4 flex items-center gap-1"
            onClick={() =>
              trackNavigationEvent.click(
                `see_all_${title.toLowerCase().replace(/\s+/g, "_")}`,
                window.location.href,
                "link",
              )
            }
          >
            {seeAllLabel} <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>

      {/* Track wrapper */}
      <div className="relative group max-w-screen-2xl mx-auto">
        {/* Left arrow — desktop scroll mode only */}
        {showArrows && (
          <button
            onClick={() => scroll("left")}
            className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-secondary-cream/95 shadow-elegant border border-text-teal/10 rounded-full items-center justify-center text-text-teal hover:bg-primary-yellow/20 transition-all duration-200 opacity-0 group-hover:opacity-100"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Horizontal scroll track; optional md+ grid when desktopGrid */}
        <div
          ref={scrollRef}
          className={trackClass}
          onScroll={onNearEnd ? handleScroll : undefined}
          style={{
            gap,
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {children}

          {/* Right spacer — mobile scroll only */}
          <div
            className={`flex-none w-4 sm:w-5 ${desktopGrid || wrapOnDesktop ? "md:hidden" : ""}`}
            aria-hidden="true"
          />
        </div>

        {/* Right arrow — desktop scroll mode only */}
        {showArrows && (
          <button
            onClick={() => scroll("right")}
            className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-secondary-cream/95 shadow-elegant border border-text-teal/10 rounded-full items-center justify-center text-text-teal hover:bg-primary-yellow/20 transition-all duration-200 opacity-0 group-hover:opacity-100"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </section>
  );
}
