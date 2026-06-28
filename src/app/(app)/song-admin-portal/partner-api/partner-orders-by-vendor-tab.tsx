"use client";

import { useEffect, useState } from "react";
import { useToastHelpers } from "@/hooks/use-toast";
import { PRODUCT_TYPES } from "./types";

type SummaryVendor = {
  vendor_id: number;
  vendor_name: string;
  vendor_slug: string;
  sandbox: boolean;
  total_orders: number;
  by_product: Array<{
    product_type: string;
    product_label: string;
    total: number;
    by_status: Record<string, number>;
  }>;
};

export function PartnerOrdersByVendorTab() {
  const toast = useToastHelpers();
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<SummaryVendor[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/partner-api/orders?view=summary");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load summary");
        if (!cancelled) setVendors(data.vendors || []);
      } catch (e: unknown) {
        if (!cancelled) {
          toast.error(
            "Could not load order summary",
            e instanceof Error ? e.message : String(e),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-600 text-sm">
        Loading orders by vendor…
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-8 text-center text-gray-500 text-sm">
        No partner API orders yet. Orders appear here once vendors create them via
        the API or admin test tools.
      </div>
    );
  }

  const productLegend = PRODUCT_TYPES.map((p) => p.value);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Counts include every product type (
        {productLegend.join(", ")}) grouped by vendor.
      </p>
      <div className="space-y-4">
        {vendors.map((v) => (
          <div
            key={v.vendor_id}
            className="bg-white border rounded-lg shadow-sm overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900">{v.vendor_name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  <span className="font-mono">{v.vendor_slug}</span>
                  {v.sandbox ? (
                    <span className="ml-2 rounded bg-amber-100 text-amber-900 px-1.5 py-0.5 text-[10px] font-medium uppercase">
                      Sandbox
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="text-sm text-gray-700">
                <span className="font-medium tabular-nums">{v.total_orders}</span>{" "}
                orders
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2">Status breakdown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {v.by_product.map((row) => (
                    <tr key={row.product_type} className="text-gray-800">
                      <td className="px-4 py-2">
                        <div className="font-medium text-gray-900">
                          {row.product_label}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {row.product_type}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium">
                        {row.total}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(row.by_status)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([status, n]) => (
                              <span
                                key={status}
                                className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-800"
                                title={status}
                              >
                                {status}:{" "}
                                <span className="ml-0.5 tabular-nums">{n}</span>
                              </span>
                            ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
