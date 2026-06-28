import type { Metadata } from "next";
import { StructuredData } from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "Song Library - Browse Personalized Songs | Melodia",
  description:
    "Explore our collection of personalized songs for birthdays, anniversaries, weddings, and more. Listen to heartfelt AI-generated music for every special occasion.",
  keywords:
    "song library, personalized songs collection, custom music examples, birthday songs, love songs, friendship songs, anniversary songs, wedding songs, AI music library",
  openGraph: {
    title: "Melodia Song Library - Personalized Songs for Every Occasion",
    description:
      "Browse hundreds of personalized songs created by Melodia. From birthdays to weddings, find the perfect musical gift.",
    url: "https://www.melodia-songs.com/library",
    siteName: "Melodia",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "Melodia Song Library",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Melodia Song Library",
    description:
      "Browse our collection of personalized songs for every occasion.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/library",
  },
};

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <StructuredData
        type="breadcrumb"
        breadcrumbItems={[
          { name: "Home", url: "/" },
          { name: "Library", url: "/library" },
        ]}
      />
      {children}
    </>
  );
}
