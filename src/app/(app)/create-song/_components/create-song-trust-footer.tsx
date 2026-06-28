import Link from "next/link";
import {
  ShieldCheck,
  RotateCcw,
  Mic2,
  Clock,
  Music4,
  Users,
  Globe2,
} from "lucide-react";

/**
 * Slim, conversion-friendly trust footer for the create-song wizard.
 *
 * Unlike the full marketing <Footer> (4-column link grid), this keeps the
 * funnel focused: real social-proof stats + trust markers, and only the
 * legal links that build buyer confidence (privacy / terms / refund).
 *
 * Social-proof figures are real, conservative counts from the DB
 * (~1,136 songs delivered, ~3,056 creators) rounded down to stay honest.
 */

const STATS: { value: string; label: string; icon: typeof Music4 }[] = [
  { value: "1,000+", label: "Songs created", icon: Music4 },
  { value: "3,000+", label: "Creators", icon: Users },
  { value: "20+", label: "Languages", icon: Globe2 },
];

const TRUST_MARKERS: { label: string; icon: typeof ShieldCheck }[] = [
  { label: "100% secure payment", icon: ShieldCheck },
  { label: "Money-back guarantee*", icon: RotateCcw },
  { label: "Studio-quality audio", icon: Mic2 },
  { label: "Delivered in 2 minutes", icon: Clock },
];

export function CreateSongTrustFooter() {
  return (
    <footer className="w-full border-t border-text-teal/10 bg-secondary-cream px-4 py-8 font-body text-text-teal">
      <div className="mx-auto max-w-screen-md">
        {/* Social proof */}
        <div className="grid grid-cols-3 gap-3 text-center">
          {STATS.map(({ value, label, icon: Icon }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 rounded-2xl bg-white/60 px-2 py-4"
            >
              <Icon className="h-5 w-5 text-accent-coral" aria-hidden="true" />
              <span className="text-xl font-extrabold tracking-tight text-text-teal">
                {value}
              </span>
              <span className="text-xs font-medium text-text-teal/70">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Trust markers */}
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
          {TRUST_MARKERS.map(({ label, icon: Icon }) => (
            <li
              key={label}
              className="flex items-center gap-1.5 text-sm font-medium text-text-teal/80"
            >
              <Icon
                className="h-4 w-4 shrink-0 text-text-teal"
                aria-hidden="true"
              />
              {label}
            </li>
          ))}
        </ul>

        {/* Legal + copyright */}
        <div className="mt-7 flex flex-col items-center gap-2 border-t border-text-teal/10 pt-5 text-center">
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
            <Link
              href="/privacy"
              className="text-text-teal/70 transition-colors hover:text-accent-coral"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-text-teal/70 transition-colors hover:text-accent-coral"
            >
              Terms &amp; Conditions
            </Link>
            <Link
              href="/refund"
              className="text-text-teal/70 transition-colors hover:text-accent-coral"
            >
              Refund Policy
            </Link>
          </nav>
          <p className="text-[11px] text-text-teal/55">
            Expert-crafted songs can take up to 72 hours to deliver.
          </p>
          <p className="text-[11px] text-text-teal/55">
            *On refunds, platform charges of ₹10 will be deducted.
          </p>
          <p className="text-xs text-text-teal/60">
            @2026 All Rights Reserved by AIVISIONLABS | www.melodia-songs.com
          </p>
        </div>
      </div>
    </footer>
  );
}
