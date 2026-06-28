import { Suspense } from "react";
import { UTMTracking } from "@/components/UTMTracking";
import { LLMReferrerTracking } from "@/components/LLMReferrerTracking";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <UTMTracking />
        <LLMReferrerTracking />
      </Suspense>
      {children}
    </>
  );
}
