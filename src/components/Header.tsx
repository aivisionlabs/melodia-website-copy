"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { HeaderLogo } from "./OptimizedLogo";
import ShareRequirementsCTA from "./ShareRequirementsCTA";

type HeaderProps = {
  /** Controls the "Start Creating Your Song" CTA in the header (desktop). */
  showCreateSongCTA?: boolean;
  /** Optional actions to show on the right side of the header (desktop + mobile). */
  rightActions?: React.ReactNode;
  /**
   * When true, hides the mobile hamburger menu.
   * Use on pages where the global bottom tab bar provides mobile navigation.
   */
  hideMobileNav?: boolean;
};

const Header = ({
  showCreateSongCTA = false,
  rightActions,
  hideMobileNav = false,
}: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="w-full bg-secondary-cream flex items-center justify-between px-2 sm:px-4 md:px-8 py-1 sm:py-2 relative shadow-elegant">
      <Link
        href="/"
        className="flex items-center gap-1 sm:gap-2"
        aria-label="Go to homepage"
      >
        <HeaderLogo alt="Melodia Logo" />
      </Link>

      {/* Desktop Navigation and CTA */}
      <div className="hidden md:flex items-center gap-6">
        <Link
          href="/library"
          className="text-teal hover:text-accent-coral font-medium transition-colors focus:underline font-body"
          aria-label="Jump to Creations section"
        >
          Library
        </Link>
        <Link
          href="/occasions"
          className="text-teal hover:text-accent-coral font-medium transition-colors focus:underline font-body"
          aria-label="Occasions"
        >
          Occasions
        </Link>
        <Link
          href="/pricing"
          className="text-teal hover:text-accent-coral font-medium transition-colors focus:underline font-body"
          aria-label="Pricing"
        >
          Pricing
        </Link>
        <Link
          href="/my-songs"
          className="text-teal hover:text-accent-coral font-medium transition-colors focus:underline font-body"
          aria-label="My Songs"
        >
          My Songs
        </Link>
        {rightActions ? (
          <div className="flex items-center gap-2">{rightActions}</div>
        ) : null}
        {showCreateSongCTA ? <ShareRequirementsCTA size="md" /> : null}
      </div>

      {/* Mobile header actions + navigation toggle */}
      <div className="flex items-center gap-2 sm:gap-4 md:hidden">
        {rightActions ? (
          <div className="flex items-center gap-2">{rightActions}</div>
        ) : null}
        {!hideMobileNav ? (
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-gray-700 hover:text-yellow-600 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:ring-offset-2 rounded"
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        ) : null}
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg md:hidden z-50">
          <nav className="flex flex-col py-2" aria-label="Mobile navigation">
            <Link
              href="/my-songs"
              className="px-4 py-3 text-gray-700 hover:text-yellow-600 hover:bg-gray-50 font-medium transition-colors focus:bg-gray-50"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Go to My Songs"
            >
              My Songs
            </Link>
            <Link
              href="/library"
              className="px-4 py-3 text-gray-700 hover:text-yellow-600 hover:bg-gray-50 font-medium transition-colors focus:bg-gray-50"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Go to Songs Library"
            >
              Library
            </Link>
            <Link
              href="/occasions"
              className="px-4 py-3 text-gray-700 hover:text-yellow-600 hover:bg-gray-50 font-medium transition-colors focus:bg-gray-50"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Occasions"
            >
              Occasions
            </Link>
            <Link
              href="/pricing"
              className="px-4 py-3 text-gray-700 hover:text-yellow-600 hover:bg-gray-50 font-medium transition-colors focus:bg-gray-50"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Pricing"
            >
              Pricing
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
