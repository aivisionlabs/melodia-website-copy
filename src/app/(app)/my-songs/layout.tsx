import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Songs | Melodia",
  description: "View and listen to your personalized songs created on Melodia.",
};

export default function MySongsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
