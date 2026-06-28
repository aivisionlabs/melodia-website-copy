import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Song Options | Melodia",
  robots: { index: false, follow: false },
};

export default function SongOptionsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
