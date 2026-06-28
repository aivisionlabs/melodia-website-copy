"use client";

import type { PartnerApiVendor } from "./types";

type Props = {
  vendors: PartnerApiVendor[];
  selectedVendorId: number | null;
  onSelectVendor: (id: number) => void;
};

export function VendorList({
  vendors,
  selectedVendorId,
  onSelectVendor,
}: Props) {
  return (
    <div className="lg:col-span-1">
      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold text-gray-900 mb-3">
          Vendors ({vendors.length})
        </h2>
        <div className="space-y-2 max-h-[70vh] overflow-y-auto">
          {vendors.map((vendor) => (
            <button
              key={vendor.id}
              type="button"
              onClick={() => onSelectVendor(vendor.id)}
              className={`w-full text-left p-3 rounded border ${
                vendor.id === selectedVendorId
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">{vendor.name}</p>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    vendor.active
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {vendor.active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{vendor.slug}</p>
              <div className="mt-1 text-xs text-gray-600 flex gap-2 flex-wrap">
                {vendor.sandbox && (
                  <span className="bg-amber-100 text-amber-700 px-2 rounded">
                    Sandbox
                  </span>
                )}
                {vendor.default_price && (
                  <span className="bg-gray-100 text-gray-700 px-2 rounded">
                    Default: {vendor.default_price_currency || "INR"}{" "}
                    {vendor.default_price}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
