import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works - Create Personalized Songs in 3 Easy Steps | Melodia",
  description:
    "Learn how Melodia creates personalized songs. Share your story, our AI generates custom lyrics & music in 20+ Indian languages, and receive your song. Starting ₹199.",
  keywords:
    "how melodia works, personalized song process, AI song creation steps, custom song India, create personalized music, Melodia song creation",
  openGraph: {
    title: "How It Works - Create Personalized Songs in 3 Easy Steps | Melodia",
    description:
      "Share your story, our AI generates custom lyrics & music, and receive your personalized song. It's that simple.",
    url: "https://www.melodia-songs.com/how-it-works",
    siteName: "Melodia",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "How Melodia Works - Personalized Song Creation",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "How It Works - Create Personalized Songs | Melodia",
    description:
      "Share your story, our AI generates custom lyrics & music, and receive your personalized song.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/how-it-works",
  },
};

export default function HowItWorksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
