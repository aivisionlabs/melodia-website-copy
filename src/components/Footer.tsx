import Link from "next/link";

const Footer = () => (
  <footer className="w-full bg-secondary-cream py-8 px-4 sm:px-5 md:px-8 lg:px-12 mt-auto">
    <div className="max-w-screen-2xl mx-auto">
      {/* Main Footer Content — 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
        {/* About Section */}
        <div>
          <div className="text-text-teal font-semibold text-sm sm:text-base mb-3 font-heading">
            About Melodia
          </div>
          <ul className="space-y-2">
            <li>
              <Link
                href="/about"
                className="text-text-teal/80 hover:text-accent-coral transition-colors text-sm font-body"
              >
                Our Story
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                className="text-text-teal/80 hover:text-accent-coral transition-colors text-sm font-body"
              >
                Contact Us
              </Link>
            </li>
            <li>
              <Link
                href="/library"
                className="text-text-teal/80 hover:text-accent-coral transition-colors text-sm font-body"
              >
                Song Library
              </Link>
            </li>
            <li>
              <Link
                href="/blog"
                className="text-text-teal/80 hover:text-accent-coral transition-colors text-sm font-body"
              >
                Blog
              </Link>
            </li>
          </ul>
        </div>

        {/* Quick Links */}
        <div>
          <div className="text-text-teal font-semibold text-sm sm:text-base mb-3 font-heading">
            Quick Links
          </div>
          <ul className="space-y-2">
            <li>
              <Link
                href="/pricing"
                className="text-text-teal/80 hover:text-accent-coral transition-colors text-sm font-body"
              >
                Pricing
              </Link>
            </li>
            <li>
              <Link
                href="/occasions"
                className="text-text-teal/80 hover:text-accent-coral transition-colors text-sm font-body"
              >
                All Occasions
              </Link>
            </li>
            <li>
              <Link
                href="/languages"
                className="text-text-teal/80 hover:text-accent-coral transition-colors text-sm font-body"
              >
                All Languages
              </Link>
            </li>
            <li>
              <Link
                href="/faq"
                className="text-text-teal/80 hover:text-accent-coral transition-colors text-sm font-body"
              >
                FAQ
              </Link>
            </li>
            <li>
              <Link
                href="/library"
                className="text-text-teal/80 hover:text-accent-coral transition-colors text-sm font-body"
              >
                Browse All Songs
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <div className="text-text-teal font-semibold text-sm sm:text-base mb-3 font-heading">
            Legal
          </div>
          <ul className="space-y-2">
            <li>
              <Link
                href="/privacy"
                className="text-text-teal/80 hover:text-accent-coral transition-colors text-sm font-body"
              >
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link
                href="/terms"
                className="text-text-teal/80 hover:text-accent-coral transition-colors text-sm font-body"
              >
                Terms & Conditions
              </Link>
            </li>
            <li>
              <Link
                href="/refund"
                className="text-text-teal/80 hover:text-accent-coral transition-colors text-sm font-body"
              >
                Refund Policy
              </Link>
            </li>
          </ul>
        </div>

        {/* Connect */}
        <div>
          <div className="text-text-teal font-semibold text-sm sm:text-base mb-3 font-heading">
            Connect
          </div>
          <ul className="space-y-2">
            <li>
              <a
                href="https://www.instagram.com/melodia.songs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-teal/80 hover:text-accent-coral transition-colors text-sm font-body"
              >
                Instagram
              </a>
            </li>
            <li>
              <a
                href="https://x.com/melodia_songs?t=-JQpro8iywfJoPTWgsFWDA&s=09"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-teal/80 hover:text-accent-coral transition-colors text-sm font-body"
              >
                Twitter/X
              </a>
            </li>
            <li>
              <a
                href="mailto:info@melodia-songs.com"
                className="text-text-teal/80 hover:text-accent-coral transition-colors text-sm font-body"
              >
                Email Us
              </a>
            </li>
            <li>
              <a
                href="https://wa.me/+917483464565"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-teal/80 hover:text-accent-coral transition-colors text-sm font-body"
              >
                WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-text-teal/15 pt-5 flex flex-col sm:flex-row items-center justify-between gap-1">
        <p className="text-text-teal/70 text-sm font-body">
          Custom songs in Hindi, Tamil, Telugu &amp; 20+ languages
        </p>
        <p className="text-text-teal/70 text-sm mb-2 md:mb-0 font-body">
          @2026 All Rights Reserved by AIVISIONLABS | www.melodia-songs.com
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
