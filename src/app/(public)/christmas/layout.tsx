import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Personalized Christmas Songs for Kids | Melodia India",
  description:
    "Create a magical personalized Christmas song featuring your child's name. AI-generated custom Christmas music in Hindi, English & 20+ Indian languages. The perfect holiday gift!",
  keywords:
    "Christmas songs for kids, personalized Christmas music, custom Christmas song India, AI Christmas song, holiday songs children, Christmas gift song",
  openGraph: {
    title: "Personalized Christmas Songs for Kids | Melodia India",
    description:
      "Create a magical personalized Christmas song featuring your child's name. The perfect holiday gift!",
    url: "https://www.melodia-songs.com/christmas",
    siteName: "Melodia",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "Personalized Christmas Songs - Melodia",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Personalized Christmas Songs for Kids | Melodia",
    description:
      "Create a magical personalized Christmas song featuring your child's name.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/christmas",
  },
};

export default function ChristmasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
