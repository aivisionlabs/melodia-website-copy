import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Request Submitted | Melodia",
  robots: { index: false, follow: false },
};

export default function RequestCaptureSuccessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
