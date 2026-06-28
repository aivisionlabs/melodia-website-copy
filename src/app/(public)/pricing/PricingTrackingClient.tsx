"use client";

import { useEffect } from "react";
import { trackFunnelEvent, trackNavigationEvent } from "@/lib/analytics";

type PricingPackage = {
  id: string;
  name: string;
  price: number;
};

function getClosestTrackedElement(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLElement>("[data-pricing-analytics]");
}

export default function PricingTrackingClient({
  packages,
}: {
  packages: PricingPackage[];
}) {
  // Page + package impressions
  useEffect(() => {
    trackFunnelEvent.pricingPageView();
    packages.forEach((pkg) => {
      trackFunnelEvent.packageView(pkg.name, pkg.price);
    });
  }, [packages]);

  // Click delegation (keeps the page mostly server-rendered)
  useEffect(() => {
    const onClickCapture = (e: MouseEvent) => {
      const el = getClosestTrackedElement(e.target);
      if (!el) return;

      const type = el.dataset.pricingAnalytics;
      if (!type) return;

      if (type === "nav_click") {
        const action = el.dataset.pricingNavAction ?? "pricing_nav_click";
        trackNavigationEvent.click(action, window.location.href, "link");
        return;
      }

      if (type === "package_select") {
        const packageId = el.dataset.packageId ?? "";
        const packageName = el.dataset.packageName ?? "";
        const priceRaw = el.dataset.packagePrice ?? "";
        const price = Number(priceRaw);
        if (!packageId || !packageName || !Number.isFinite(price)) return;
        trackFunnelEvent.packageSelect(packageName, price, packageId);
      }
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, []);

  return null;
}

