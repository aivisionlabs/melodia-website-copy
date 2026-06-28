"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToastHelpers } from "@/hooks/use-toast";
import type { PartnerApiVendor } from "./types";
import { CreatePartnerInvoiceWizard } from "./create-partner-invoice-wizard";
import { INVOICE_PRODUCT_TYPES } from "@/lib/partner-api/invoice-products";

type InvoiceRow = {
  id: number;
  vendor_id: number;
  vendor_name: string;
  invoice_number: string;
  product_type: string;
  period_start: string;
  period_end: string;
  currency: string;
  billable_quantity: number;
  subtotal: string;
  created_at: string;
};

type Props = {
  vendors: PartnerApiVendor[];
};

export function PartnerInvoicesTab({ vendors }: Props) {
  const toast = useToastHelpers();
  const [vendorFilter, setVendorFilter] = useState<string>("");
  const [productFilter, setProductFilter] = useState<string>("");
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "50" });
      if (vendorFilter) params.set("vendor_id", vendorFilter);
      if (productFilter) params.set("product_type", productFilter);
      const res = await fetch(`/api/admin/partner-api/invoices?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load invoices");
      setInvoices(data.invoices ?? []);
    } catch (e: unknown) {
      toast.error(
        "Could not load invoices",
        e instanceof Error ? e.message : String(e),
      );
    } finally {
      setLoading(false);
    }
  }, [vendorFilter, productFilter]);

  useEffect(() => {
    void fetchInvoices();
  }, [fetchInvoices]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-gray-600">Vendor</label>
          <select
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
          >
            <option value="">All vendors</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
                {v.sandbox ? " (sandbox)" : ""}
              </option>
            ))}
          </select>
          <label className="text-sm text-gray-600">Product</label>
          <select
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
          >
            <option value="">All products</option>
            {INVOICE_PRODUCT_TYPES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        {!showWizard ? (
          <Button type="button" onClick={() => setShowWizard(true)}>
            Create invoice
          </Button>
        ) : null}
      </div>

      {showWizard ? (
        <CreatePartnerInvoiceWizard
          vendors={vendors}
          onClose={() => setShowWizard(false)}
          onCreated={() => void fetchInvoices()}
        />
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-500">Loading invoices…</p>
      ) : invoices.length === 0 ? (
        <p className="text-sm text-gray-500">No invoices yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-600">
                <th className="p-3">Invoice #</th>
                <th className="p-3">Vendor</th>
                <th className="p-3">Product</th>
                <th className="p-3">Period</th>
                <th className="p-3">Qty</th>
                <th className="p-3">Total</th>
                <th className="p-3">Created</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-100">
                  <td className="p-3 font-mono text-xs">{inv.invoice_number}</td>
                  <td className="p-3">{inv.vendor_name}</td>
                  <td className="p-3">{inv.product_type}</td>
                  <td className="p-3 text-gray-600">
                    {inv.period_start.slice(0, 10)} – {inv.period_end.slice(0, 10)}
                  </td>
                  <td className="p-3">{inv.billable_quantity}</td>
                  <td className="p-3 font-medium">
                    {inv.currency} {inv.subtotal}
                  </td>
                  <td className="p-3 text-gray-500">
                    {inv.created_at.slice(0, 10)}
                  </td>
                  <td className="p-3">
                    <a
                      href={`/api/admin/partner-api/invoices/${inv.id}/pdf`}
                      className="text-indigo-600 hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
