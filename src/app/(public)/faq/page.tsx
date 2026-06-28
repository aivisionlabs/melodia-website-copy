import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FAQ } from "@/components/FAQ";
import { StructuredData } from "@/components/StructuredData";
import {
  homepageFAQ,
  PRICING_FAQ,
  OCCASION_FAQ,
  HOMEPAGE_FAQ,
} from "@/lib/seo/faq";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | Melodia",
  description:
    "Find answers to common questions about Melodia, India's personalized song creation platform. Learn about pricing, languages, occasions, song creation process, and more.",
  keywords:
    "Melodia FAQ, personalized song questions, custom song India FAQ, AI song generator questions, personalized music FAQ, wedding song FAQ, birthday song FAQ",
  openGraph: {
    title: "Frequently Asked Questions | Melodia",
    description:
      "Answers to all your questions about creating personalized songs with Melodia — pricing, languages, occasions, and more.",
    url: "https://www.melodia-songs.com/faq",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "Melodia FAQ",
      },
    ],
  },
  twitter: {
    title: "Frequently Asked Questions | Melodia",
    description:
      "Answers to all your questions about creating personalized songs with Melodia.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/faq",
  },
};

const allFAQItems = [
  ...homepageFAQ,
  ...PRICING_FAQ,
  ...HOMEPAGE_FAQ,
];

const occasionSections = [
  { key: "weddings", label: "Wedding Songs" },
  { key: "birthday", label: "Birthday Songs" },
  { key: "anniversary", label: "Anniversary Songs" },
  { key: "romantic", label: "Romantic Songs" },
  { key: "sangeet", label: "Sangeet Songs" },
  { key: "haldi", label: "Haldi Songs" },
  { key: "mehndi", label: "Mehndi Songs" },
  { key: "ring-ceremony", label: "Ring Ceremony Songs" },
  { key: "lullaby", label: "Lullaby Songs" },
  { key: "kids", label: "Kids Songs" },
  { key: "party", label: "Party Songs" },
  { key: "friendship", label: "Friendship Songs" },
  { key: "apology", label: "Apology Songs" },
  { key: "corporate-events", label: "Corporate Event Songs" },
  { key: "farewell", label: "Farewell Songs" },
  { key: "siblings", label: "Sibling Songs" },
  { key: "parents", label: "Parent Songs" },
  { key: "congratulations", label: "Congratulations Songs" },
  { key: "thank-you", label: "Thank You Songs" },
  { key: "motivational", label: "Motivational Songs" },
  { key: "devotional-spiritual", label: "Devotional Songs" },
  { key: "festive-holiday", label: "Festival Songs" },
];

export default function FAQPage() {
  const combinedFAQForSchema = [
    ...allFAQItems,
    ...Object.values(OCCASION_FAQ).flat(),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-cream via-primary-yellow/5 to-accent-coral/5 flex flex-col">
      <StructuredData type="faq" faqItems={combinedFAQForSchema} />

      <div className="hidden md:block"><Header /></div>

      <main className="flex-1 py-12 sm:py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-text-teal text-center font-heading mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-text-teal/70 text-center text-base sm:text-lg max-w-2xl mx-auto mb-12">
            Everything you need to know about creating personalized songs with
            Melodia, India&apos;s leading AI-powered song creation platform.
          </p>

          <FAQ
            items={homepageFAQ}
            title="About Melodia"
            containerClassName="pb-8"
          />

          <FAQ
            items={HOMEPAGE_FAQ}
            title="AI Song Generation"
            containerClassName="pb-8"
          />

          <FAQ
            items={PRICING_FAQ}
            title="Pricing & Delivery"
            containerClassName="pb-8"
          />

          {occasionSections.map(
            ({ key, label }) =>
              OCCASION_FAQ[key] && (
                <FAQ
                  key={key}
                  items={OCCASION_FAQ[key]}
                  title={label}
                  containerClassName="pb-8"
                />
              ),
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
