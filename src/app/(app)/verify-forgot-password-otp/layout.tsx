import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify OTP | Melodia",
  robots: { index: false, follow: false },
};

export default function VerifyOTPLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
