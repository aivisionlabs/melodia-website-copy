import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Song Request | Melodia",
  robots: { index: false, follow: false },
};

export default function CreateSongRequestLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
