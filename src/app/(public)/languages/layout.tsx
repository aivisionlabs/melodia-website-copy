"use client";

import { StructuredData } from "@/components/StructuredData";
import { LANGUAGE_PAGES } from "@/lib/seo/language-pages";
import { usePathname } from "next/navigation";

const LANGUAGE_LABELS = Object.fromEntries(
  LANGUAGE_PAGES.map((lang) => [lang.slug, lang.name]),
);

export default function LanguagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const parts = (pathname || "").split("/").filter(Boolean);
  const languageSlug =
    parts.length >= 2 && parts[0] === "languages" ? parts[1] : null;

  const breadcrumbItems = [
    { name: "Home", url: "/" },
    { name: "Languages", url: "/languages" },
  ];

  if (languageSlug) {
    breadcrumbItems.push({
      name: LANGUAGE_LABELS[languageSlug] || languageSlug.replace(/-/g, " "),
      url: `/languages/${languageSlug}`,
    });
  }

  return (
    <>
      <StructuredData type="breadcrumb" breadcrumbItems={breadcrumbItems} />
      {children}
    </>
  );
}
