"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { HeaderLogo } from "./OptimizedLogo";

const AppHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 w-full bg-white border-b border-gray-200 shadow-sm z-40">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label="Go to homepage"
        >
          <HeaderLogo alt="Melodia Logo" />
          <span className="text-xl font-bold font-heading text-melodia-teal">
            Melodia
          </span>
        </Link>

        {/* Hamburger Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 text-melodia-teal hover:text-melodia-coral transition-colors focus:outline-none focus:ring-2 focus:ring-melodia-coral focus:ring-offset-2 rounded-lg"
          aria-label="Toggle navigation menu"
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50">
          <nav className="flex flex-col py-2" aria-label="Mobile navigation">
            <Link
              href="/about"
              className="px-4 py-3 text-melodia-teal hover:text-melodia-coral hover:bg-gray-50 font-medium font-body transition-colors focus:bg-gray-50"
              onClick={() => setIsMenuOpen(false)}
              aria-label="About Us"
            >
              About Us
            </Link>
            <Link
              href="/contact"
              className="px-4 py-3 text-melodia-teal hover:text-melodia-coral hover:bg-gray-50 font-medium font-body transition-colors focus:bg-gray-50"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Contact Us"
            >
              Contact Us
            </Link>
            <Link
              href="/#testimonials-title"
              className="px-4 py-3 text-melodia-teal hover:text-melodia-coral hover:bg-gray-50 font-medium font-body transition-colors focus:bg-gray-50"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Jump to Testimonials section"
            >
              Testimonials
            </Link>
            <div className="border-t border-gray-200 my-2"></div>
            <Link
              href="/privacy"
              className="px-4 py-3 text-melodia-teal hover:text-melodia-coral hover:bg-gray-50 font-medium font-body transition-colors focus:bg-gray-50"
              onClick={() => setIsMenuOpen(false)}
              aria-label="View Privacy Policy"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="px-4 py-3 text-melodia-teal hover:text-melodia-coral hover:bg-gray-50 font-medium font-body transition-colors focus:bg-gray-50"
              onClick={() => setIsMenuOpen(false)}
              aria-label="View Terms of Service"
            >
              Terms & Conditions
            </Link>
            <Link
              href="/refund"
              className="px-4 py-3 text-melodia-teal hover:text-melodia-coral hover:bg-gray-50 font-medium font-body transition-colors focus:bg-gray-50"
              onClick={() => setIsMenuOpen(false)}
              aria-label="View Refund Policy"
            >
              Refund Policy
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default AppHeader;
