"use client";

import { CenterLogo } from "@/components/OptimizedLogo";
import Link from "next/link";
import { useEffect } from "react";

// Custom Error Icon SVG - Brand-aligned with rounded, friendly design
const ErrorIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* Outer circle with gradient */}
    <circle
      cx="60"
      cy="60"
      r="56"
      fill="url(#errorGradient)"
      opacity="0.1"
    />
    {/* Inner circle background */}
    <circle cx="60" cy="60" r="48" fill="#EF476F" opacity="0.1" />
    {/* Alert triangle */}
    <path
      d="M60 25L25 85H95L60 25Z"
      fill="#EF476F"
      fillRule="evenodd"
      clipRule="evenodd"
    />
    {/* Exclamation mark */}
    <path
      d="M60 45V65M60 70V75"
      stroke="#FDFDFD"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <defs>
      <linearGradient id="errorGradient" x1="60" y1="4" x2="60" y2="116">
        <stop stopColor="#EF476F" stopOpacity="0.2" />
        <stop offset="1" stopColor="#EF476F" stopOpacity="0.05" />
      </linearGradient>
    </defs>
  </svg>
);

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console (client-side only, no database access)
    console.error('Error boundary caught error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      digest: error.digest,
    });
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FDFDFD] px-4 py-8">
      <section
        className="text-center max-w-lg mx-auto w-full"
        aria-labelledby="error-title"
      >
        {/* Card Container with brand styling */}
        <div className="bg-[#FDFDFD] rounded-2xl shadow-[0_4px_6px_-1px_rgba(7,59,76,0.1),0_2px_4px_-1px_rgba(7,59,76,0.06)] p-8 md:p-12 border border-[#073B4C]/5">
          {/* Logo */}
          <div className="mb-10">
            <CenterLogo
              alt="Melodia"
              className="w-auto h-auto md:h-16 mx-auto"
            />
          </div>

          {/* Error Icon */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <ErrorIcon className="w-24 h-24 md:w-28 md:h-28" />
            </div>
          </div>

          {/* Error Code - Vibrant Coral */}
          <h1
            id="error-title"
            className="text-6xl md:text-7xl font-bold mb-4 text-[#EF476F] font-heading tracking-tight"
          >
            500
          </h1>

          {/* Error Title - Dark Teal, Poppins */}
          <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-[#073B4C] font-heading">
            Something went wrong
          </h2>

          {/* Error Message - Dark Teal, Montserrat */}
          <p className="text-base md:text-lg text-[#073B4C]/80 mb-10 leading-relaxed font-body max-w-md mx-auto">
            We're sorry, but something unexpected happened. Our team has been
            notified and is working to fix this issue.
          </p>

          {/* Action Buttons */}
          <div className="space-y-3 max-w-sm mx-auto">
            {/* Primary Button - Bright Yellow with Dark Teal text */}
            <button
              onClick={reset}
              className="w-full bg-[#FFD166] hover:bg-[#FFC107] active:bg-[#FFB300] text-[#073B4C] font-bold py-3.5 px-6 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#FFD166] focus:ring-offset-2 shadow-[0_2px_4px_rgba(255,209,102,0.3)] hover:shadow-[0_4px_8px_rgba(255,209,102,0.4)] font-heading text-base"
              aria-label="Try again to reload the page"
            >
              Try Again
            </button>

            {/* Secondary Button - Coral border, transparent background */}
            <Link
              href="/"
              className="block w-full border-2 border-[#EF476F] bg-transparent hover:bg-[#EF476F] active:bg-[#E91E63] text-[#EF476F] hover:text-white font-semibold py-3.5 px-6 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#EF476F] focus:ring-offset-2 font-heading text-base"
              aria-label="Return to home page"
            >
              Return to Home
            </Link>
          </div>

          {/* Error ID - Muted text */}
          {error.digest && (
            <div className="mt-10 pt-8 border-t border-[#073B4C]/10">
              <p className="text-xs text-[#073B4C]/50 font-mono">
                Error ID: {error.digest}
              </p>
            </div>
          )}
        </div>

        {/* Additional Help Text */}
        <p className="text-sm text-[#073B4C]/60 mt-6 font-body">
          If this problem persists, please{" "}
          <Link
            href="/contact"
            className="text-[#EF476F] hover:text-[#E91E63] underline font-medium transition-colors"
          >
            contact support
          </Link>
        </p>
      </section>
    </main>
  );
}
