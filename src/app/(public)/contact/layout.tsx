import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Melodia — Create a Heartfelt, Personalized Song",
  description:
    "Contact Melodia, India's leading personalized song creation platform. Email info@melodia-songs.com, WhatsApp +91 7483464565, or fill out our contact form for custom song inquiries.",
  keywords:
    "contact melodia, melodia India, personalized songs help, melodia phone number, melodia email, melodia whatsapp, custom song platform India",
  openGraph: {
    title: "Contact Melodia — Create a Heartfelt, Personalized Song",
    description:
      "Get in touch with Melodia for personalized song creation. Email, WhatsApp, or contact form available.",
    url: "https://www.melodia-songs.com/contact",
    siteName: "Melodia",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "Contact Melodia India",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Melodia - Personalized Songs India",
    description: "Get in touch with Melodia, India's personalized song creation platform.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
