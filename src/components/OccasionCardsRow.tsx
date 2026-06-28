"use client";

import Image from "next/image";
import Link from "next/link";
import { trackOccasionEvent, trackNavigationEvent } from "@/lib/analytics";

interface Occasion {
  label: string;
  image: string;
  /** Path to occasion landing page, e.g. /occasions/birthday */
  href: string;
}

const occasions: Occasion[] = [
  {
    label: "Father's Day",
    image: "/images/occasions/fathers-day/fathers-day-hero.png",
    href: "/occasions/fathers-day",
  },
  {
    label: "Kid's Birthday",
    image: "/images/occasions/kid-birthday.png",
    href: "/occasions/birthday",
  },
  {
    label: "Adult Birthday",
    image: "/images/occasions/adult-birthday.png",
    href: "/occasions/adult-birthday",
  },
  {
    label: "Anniversary",
    image: "/images/occasions/anniversary.png",
    href: "/occasions/anniversary",
  },
  {
    label: "Kids",
    image: "/images/occasions/kids.png",
    href: "/occasions/kids",
  },
  {
    label: "Romantic",
    image: "/images/occasions/romantic.png",
    href: "/occasions/romantic",
  },
  {
    label: "Wedding",
    image: "/images/occasions/wedding.png",
    href: "/occasions/weddings",
  },
  {
    label: "Friendship",
    image: "/images/occasions/friendship.png",
    href: "/occasions/friendship",
  },
  {
    label: "Parents",
    image: "/images/occasions/parents.png",
    href: "/occasions/parents",
  },
  {
    label: "Party",
    image: "/images/occasions/party.png",
    href: "/occasions/party",
  },
];

export default function OccasionCardsRow() {
  return (
    <section className="py-4 sm:py-5 md:py-7" aria-label="Pick your occasion">
      <div className="flex items-center justify-between px-6 sm:px-5 md:px-8 lg:px-12 mb-3 md:mb-4 max-w-6xl mx-auto">
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold font-heading text-text-teal leading-tight">
            Craft a perfect song for
          </h2>
        </div>
        <Link
          href="/occasions"
          className="text-sm font-medium text-accent-coral hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-coral rounded"
          onClick={() =>
            trackNavigationEvent.click(
              "occasions_all",
              window.location.href,
              "link",
            )
          }
        >
          All occasions
        </Link>
      </div>

      <div className="w-full">
        <div className="relative w-full rounded-none sm:rounded-3xl border-y sm:border border-accent-coral/20 bg-gradient-to-r from-secondary-cream via-white to-secondary-cream/80 py-3 sm:p-4 shadow-[0_10px_35px_rgba(7,59,76,0.08)]">
          <div className="pointer-events-none absolute left-0 sm:left-3 top-0 sm:top-3 bottom-0 sm:bottom-3 w-8 bg-gradient-to-r from-secondary-cream/95 to-transparent sm:rounded-l-2xl z-10" />
          <div className="pointer-events-none absolute right-0 sm:right-3 top-0 sm:top-3 bottom-0 sm:bottom-3 w-8 bg-gradient-to-l from-secondary-cream/95 to-transparent sm:rounded-r-2xl z-10" />

          <div className="flex gap-3 sm:gap-4 overflow-x-auto px-4 sm:px-2 md:px-8 lg:px-12 pb-1.5 no-scrollbar snap-x snap-mandatory scroll-pl-4 sm:scroll-pl-2 md:scroll-pl-8 lg:scroll-pl-12">
            {occasions.map((occ) => (
              <Link
                key={occ.href}
                href={occ.href}
                className="group flex-shrink-0 w-[44vw] min-w-[160px] max-w-[200px] sm:w-[220px] md:w-[236px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-coral rounded-2xl sm:rounded-3xl snap-start"
                aria-label={`Go to ${occ.label} songs`}
                onClick={() =>
                  trackOccasionEvent.clickOccasion(
                    occ.label,
                    occ.href,
                    "home_occasion_row",
                  )
                }
              >
                <div className="relative w-full aspect-[4/5] rounded-2xl sm:rounded-3xl overflow-hidden shadow-md group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300">
                  <Image
                    src={occ.image}
                    alt={occ.label}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 44vw, (max-width: 768px) 220px, 236px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  <div className="absolute left-2.5 right-2.5 bottom-2.5 rounded-xl bg-black/35 backdrop-blur-[1px] border border-white/20 px-2.5 py-2">
                    <span className="block text-center text-sm sm:text-base font-bold font-heading text-white leading-tight">
                      {occ.label}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
