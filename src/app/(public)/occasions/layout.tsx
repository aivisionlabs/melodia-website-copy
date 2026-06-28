"use client";

import { StructuredData } from "@/components/StructuredData";
import { usePathname } from "next/navigation";

const OCCASION_LABELS: Record<string, string> = {
  anniversary: "Anniversary",
  apology: "Apology",
  birthday: "Birthday",
  "adult-birthday": "Adult Birthday",
  "mothers-day": "Mother's Day",
  "corporate-events": "Corporate Events",
  "devotional-spiritual": "Devotional / Spiritual",
  farewell: "Farewell",
  "festive-holiday": "Festive / Holiday",
  friendship: "Friendship",
  kids: "Kids",
  lullaby: "Lullaby",
  motivational: "Motivational",
  parents: "Parents",
  party: "Party",
  romantic: "Romantic",
  sangeet: "Sangeet",
  siblings: "Siblings",
  "thank-you": "Thank You",
  weddings: "Weddings",
  congratulations: "Congratulations",
};

export default function OccasionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const parts = (pathname || "").split("/").filter(Boolean);
  const occasionSlug =
    parts.length >= 2 && parts[0] === "occasions" ? parts[1] : null;

  const breadcrumbItems = [
    { name: "Home", url: "/" },
    { name: "Occasions", url: "/occasions" },
  ];

  if (occasionSlug) {
    breadcrumbItems.push({
      name: OCCASION_LABELS[occasionSlug] || occasionSlug.replace(/-/g, " "),
      url: `/occasions/${occasionSlug}`,
    });
  }

  return (
    <>
      <StructuredData type="breadcrumb" breadcrumbItems={breadcrumbItems} />
      {children}
    </>
  );
}
