import { Providers } from "../providers";
import { Suspense } from "react";
import { UTMTracking } from "@/components/UTMTracking";
import { LLMReferrerTracking } from "@/components/LLMReferrerTracking";
import { Toaster } from "@/components/ui/toaster";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <Suspense fallback={null}>
        <UTMTracking />
        <LLMReferrerTracking />
      </Suspense>
      {children}
      <Toaster />
    </Providers>
  );
}
