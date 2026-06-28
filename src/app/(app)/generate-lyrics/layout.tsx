import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Generate Lyrics | Melodia",
  robots: { index: false, follow: false },
};

export default function GenerateLyricsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
