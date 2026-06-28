"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Heart, Cake, Gift, Users } from "lucide-react";
import Link from "next/link";

interface BulkOrderCTAProps {
  variant?: "default" | "pricing";
}

const BulkOrderCTA = ({ variant = "default" }: BulkOrderCTAProps) => {
  const isPricingVariant = variant === "pricing";

  return (
    <section
      className={`py-12 sm:py-16 md:py-20 px-4 relative ${
        isPricingVariant
          ? "bg-gradient-to-br from-accent-coral/10 via-primary-yellow/5 to-text-teal/10"
          : "bg-gradient-to-br from-text-teal to-text-teal/90 text-white"
      }`}
    >
      {!isPricingVariant && (
        <div className="absolute inset-0 bg-black/20"></div>
      )}
      <div
        className={`relative z-10 max-w-4xl mx-auto text-center ${isPricingVariant ? "" : "text-white"}`}
      >
        <div className="flex justify-center gap-4 sm:gap-6 mb-6">
          <WeddingIcon variant={variant} />
          <BirthdayIcon variant={variant} />
          <AnniversaryIcon variant={variant} />
          {isPricingVariant && <CorporateIcon variant={variant} />}
        </div>
        <h2
          className={`text-2xl sm:text-3xl font-bold font-heading mb-4 ${
            isPricingVariant ? "text-text-teal" : "text-primary-yellow"
          }`}
        >
          {isPricingVariant
            ? "Bulk & Corporate Enquiries"
            : "Bulk Orders for Your Special Events"}
        </h2>
        <p
          className={`text-base sm:text-lg max-w-2xl mx-auto mb-8 ${
            isPricingVariant ? "text-text-teal/80" : "text-secondary-cream/90"
          }`}
        >
          {isPricingVariant
            ? "Planning multiple songs for your event or corporate needs? Contact us for special bulk packages and corporate pricing."
            : "Need multiple personalized songs for your wedding, corporate event, or celebration? Get special discounts and dedicated support with our bulk order packages."}
        </p>
        <Link href="/contact">
          <Button
            size="lg"
            className={`${
              isPricingVariant
                ? "bg-gradient-to-r from-accent-coral to-red-400 text-white"
                : "bg-gradient-to-r from-primary-yellow to-accent-coral text-white"
            } font-bold py-4 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105`}
          >
            {isPricingVariant ? "Contact Us" : "Contact Us for Bulk Orders"}
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </Link>
      </div>
    </section>
  );
};

const WeddingIcon = ({ variant }: { variant?: "default" | "pricing" }) => (
  <div
    className={`p-3 rounded-full ${
      variant === "pricing"
        ? "bg-white/80 border border-primary-yellow/20"
        : "bg-white/10"
    }`}
  >
    <Heart
      className={`w-6 h-6 sm:w-8 sm:h-8 ${
        variant === "pricing" ? "text-accent-coral" : "text-accent-coral"
      }`}
    />
  </div>
);

const BirthdayIcon = ({ variant }: { variant?: "default" | "pricing" }) => (
  <div
    className={`p-3 rounded-full ${
      variant === "pricing"
        ? "bg-white/80 border border-primary-yellow/20"
        : "bg-white/10"
    }`}
  >
    <Cake
      className={`w-6 h-6 sm:w-8 sm:h-8 ${
        variant === "pricing" ? "text-primary-yellow" : "text-primary-yellow"
      }`}
    />
  </div>
);

const AnniversaryIcon = ({ variant }: { variant?: "default" | "pricing" }) => (
  <div
    className={`p-3 rounded-full ${
      variant === "pricing"
        ? "bg-white/80 border border-primary-yellow/20"
        : "bg-white/10"
    }`}
  >
    <Gift
      className={`w-6 h-6 sm:w-8 sm:h-8 ${
        variant === "pricing" ? "text-text-teal" : "text-secondary-cream"
      }`}
    />
  </div>
);

const CorporateIcon = ({ variant }: { variant?: "default" | "pricing" }) => (
  <div
    className={`p-3 rounded-full ${
      variant === "pricing"
        ? "bg-white/80 border border-primary-yellow/20"
        : "bg-white/10"
    }`}
  >
    <Users
      className={`w-6 h-6 sm:w-8 sm:h-8 ${
        variant === "pricing" ? "text-text-teal" : "text-white"
      }`}
    />
  </div>
);

export default BulkOrderCTA;
