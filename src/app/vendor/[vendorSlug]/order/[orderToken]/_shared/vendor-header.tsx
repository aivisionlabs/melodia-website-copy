"use client";

import Image from "next/image";
import type { VendorInfo } from "./types";

export function VendorHeader({ vendor }: { vendor: VendorInfo }) {
  return (
    <header className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3">
      <div className="max-w-lg mx-auto flex items-center justify-center">
        {vendor.logo_url ? (
          <Image
            src={vendor.logo_url}
            alt={vendor.name}
            width={256}
            height={56}
            className="w-full h-auto"
          />
        ) : (
          <span className="font-bold text-lg text-text-teal">
            {vendor.name}
          </span>
        )}
      </div>
    </header>
  );
}
