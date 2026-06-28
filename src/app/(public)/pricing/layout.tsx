import type { Metadata } from "next";
import { StructuredData } from "@/components/StructuredData";
import { PRICING_FAQ } from "@/lib/seo/faq";

export const metadata: Metadata = {
  title: "Personalized Song Packages from ₹199 | Melodia India",
  description:
    "Heartfelt, personalized songs for your loved ones from INR 199 — in Hindi, Tamil, Telugu & 20+ Indian languages. Making every occasion unforgettable with Melodia.",
  keywords:
    "melodia pricing, personalized song pricing India, custom song packages INR, AI song generator pricing, wedding song price, birthday song cost India, Melodia packages",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Melodia Pricing - Personalized Songs from INR 199 | India",
    description:
      "Create personalized songs from INR 199. Three packages for custom song creation in 20+ Indian languages.",
    url: "https://www.melodia-songs.com/pricing",
    siteName: "Melodia",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "Melodia Pricing - Personalized Songs India",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Melodia Pricing - Personalized Songs from INR 199",
    description:
      "Create personalized songs from INR 199. Three packages for custom song creation in 20+ Indian languages.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <StructuredData type="product" />
      <StructuredData
        type="faq"
        faqItems={PRICING_FAQ.map((f) => ({
          question: f.question,
          answer: f.answer,
        }))}
      />
      {children}
    </>
  );
}
