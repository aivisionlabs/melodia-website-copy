import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Song Templates | Melodia",
  description: "Browse and customize song templates on Melodia.",
};

export default function SongTemplateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
