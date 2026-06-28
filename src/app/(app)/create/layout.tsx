import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create a Song | Melodia",
  description:
    "Make a personalized song on Melodia for birthdays, anniversaries, weddings, and more. 20+ Indian languages, 22+ occasions, studio-quality audio. From ₹199.",
  openGraph: {
    title: "Create a Song | Melodia",
    description:
      "Make a personalized song on Melodia for birthdays, anniversaries, weddings, and more. 20+ Indian languages, 22+ occasions, studio-quality audio. From ₹199.",
    url: "https://www.melodia-songs.com/create",
    siteName: "Melodia",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "Create a personalized song on Melodia",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Create a Song | Melodia",
    description:
      "Make a personalized song on Melodia for birthdays, anniversaries, weddings, and more. 20+ Indian languages, 22+ occasions, studio-quality audio. From ₹199.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
