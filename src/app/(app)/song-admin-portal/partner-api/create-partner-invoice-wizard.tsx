"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToastHelpers } from "@/hooks/use-toast";
import type { PartnerApiVendor } from "./types";
import { TemplatedSongPricingStep } from "./pricing-steps/templated-song";

export type InvoiceProductType = "customer_templated_song";

type ExcludedRow = CandidateRow & {
  exclude_reason: string | null;
};

type CandidateRow = {
  order_id: number;
  external_order_id: string;
  recipient_name: string | null;
  status?: string;
  completed_at: string | null;
  is_test_order: boolean;
};

const EXCLUDE_REASON_LABELS: Record<string, string> = {
  outside_period: "Outside billing period",
  order_not_completed: "Order not completed",
  sandbox_vendor: "Sandbox vendor",
};

type Props = {
  vendors: PartnerApiVendor[];
  onClose: () => void;
  onCreated: () => void;
};

type WizardStep = 1 | 2 | 3 | 4;

export function CreatePartnerInvoiceWizard({ vendors, onClose, onCreated }: Props) {
  const toast = useToastHelpers();
  const productionVendors = useMemo(
    () => vendors.filter((v) => !v.sandbox && v.active),
    [vendors],
  );

  const [step, setStep] = useState<WizardStep>(1);
  const [busy, setBusy] = useState(false);
  const [vendorId, setVendorId] = useState<string>("");
  const [productType, setProductType] = useState<InvoiceProductType>(
    "customer_templated_song",
  );
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [notes, setNotes] = useState("");

  const [billable, setBillable] = useState<CandidateRow[]>([]);
  const [testRows, setTestRows] = useState<CandidateRow[]>([]);
  const [excludedRows, setExcludedRows] = useState<ExcludedRow[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  const [currency, setCurrency] = useState("INR");
  const [unitPrice, setUnitPrice] = useState("");

  const selectedVendor = productionVendors.find(
    (v) => v.id === Number.parseInt(vendorId, 10),
  );

  const loadCandidates = useCallback(async (options?: { advanceToReview?: boolean }) => {
    const vid = Number.parseInt(vendorId, 10);
    if (!vid || !periodFrom || !periodTo) {
      toast.error("Missing fields", "Select vendor and billing period.");
      return;
    }
    setLoadingCandidates(true);
    try {
      const params = new URLSearchParams({
        vendor_id: String(vid),
        product_type: productType,
        from: periodFrom,
        to: periodTo,
      });
      const res = await fetch(`/api/admin/partner-api/invoices/candidates?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load candidates");

      setBillable(data.billable ?? []);
      setTestRows(data.test ?? []);
      setExcludedRows(data.excluded ?? []);
      setSelectedOrderIds(new Set());

      if (productType === "customer_templated_song" && selectedVendor?.default_price) {
        setUnitPrice(selectedVendor.default_price);
        if (selectedVendor.default_price_currency) {
          setCurrency(selectedVendor.default_price_currency);
        }
      }

      if (options?.advanceToReview !== false) {
        setStep(2);
      }
    } catch (e: unknown) {
      toast.error(
        "Could not load orders",
        e instanceof Error ? e.message : String(e),
      );
    } finally {
      setLoadingCandidates(false);
    }
  }, [vendorId, periodFrom, periodTo, productType, selectedVendor]);

  const toggleOrderSelection = (orderId: number) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const selectAllBillable = () => {
    setSelectedOrderIds(new Set(billable.map((r) => r.order_id)));
  };

  const selectAllTest = () => {
    setSelectedOrderIds(new Set(testRows.map((r) => r.order_id)));
  };

  const clearOrderSelection = () => {
    setSelectedOrderIds(new Set());
  };

  const markSelectedTest = async (isTest: boolean) => {
    const ids = [...selectedOrderIds];
    if (ids.length === 0) {
      toast.error("No selection", "Select orders first.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/partner-api/orders/test-flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_ids: ids,
          is_test_order: isTest,
          vendor_id: Number.parseInt(vendorId, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update test flags");
      toast.success(
        isTest ? "Marked as test" : "Unmarked test",
        `${data.updated_count} order(s) updated.`,
      );
      await loadCandidates({ advanceToReview: false });
    } catch (e: unknown) {
      toast.error(
        "Update failed",
        e instanceof Error ? e.message : String(e),
      );
    } finally {
      setBusy(false);
    }
  };

  const submitInvoice = async () => {
    const vid = Number.parseInt(vendorId, 10);
    if (!vid || billable.length === 0) {
      toast.error("Nothing to bill", "No billable orders in this period.");
      return;
    }

    setBusy(true);
    try {
      const price = Number.parseFloat(unitPrice);
      if (!Number.isFinite(price) || price < 0) {
        throw new Error("Enter a valid per-song price");
      }
      const pricing_defaults = { unit_price: price };
      const lines = billable.map((r) => ({ order_id: r.order_id }));

      const res = await fetch("/api/admin/partner-api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor_id: vid,
          product_type: productType,
          period_start: periodFrom,
          period_end: periodTo,
          currency,
          pricing_defaults,
          notes: notes.trim() || null,
          lines,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create invoice");

      toast.success(
        "Invoice created",
        data.invoice?.invoice_number ?? "Download PDF from the list.",
      );
      onCreated();
      onClose();
    } catch (e: unknown) {
      toast.error(
        "Invoice failed",
        e instanceof Error ? e.message : String(e),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Create partner invoice</h2>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>

      <p className="text-sm text-gray-600">Step {step} of 4</p>

      {step === 1 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">Vendor (production)</span>
            <select
              className="rounded-md border border-gray-300 px-3 py-2"
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
            >
              <option value="">Select vendor</option>
              {productionVendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">Product type</span>
            <select
              className="rounded-md border border-gray-300 px-3 py-2"
              value={productType}
              onChange={(e) =>
                setProductType(e.target.value as InvoiceProductType)
              }
            >
              <option value="customer_templated_song">Templated song</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">Period from</span>
            <input
              type="date"
              className="rounded-md border border-gray-300 px-3 py-2"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">Period to</span>
            <input
              type="date"
              className="rounded-md border border-gray-300 px-3 py-2"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
            />
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <Button
              type="button"
              disabled={loadingCandidates}
              onClick={() => void loadCandidates({ advanceToReview: true })}
            >
              {loadingCandidates ? "Loading…" : "Next: review orders"}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          {billable.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-medium">No billable orders for this product type and period.</p>
              <p className="mt-1 text-amber-800">
                Templated song orders must be{" "}
                <strong>completed</strong> or{" "}
                <strong>song generation in progress</strong> to bill.
              </p>
              {excludedRows.length > 0 ? (
                <ul className="mt-2 list-disc pl-5 text-amber-800">
                  {Object.entries(
                    excludedRows.reduce<Record<string, number>>((acc, row) => {
                      const key = row.exclude_reason ?? "other";
                      acc[key] = (acc[key] ?? 0) + 1;
                      return acc;
                    }, {}),
                  ).map(([reason, count]) => (
                    <li key={reason}>
                      {count} × {EXCLUDE_REASON_LABELS[reason] ?? reason}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium">
              Billable: {billable.length} · Test in period: {testRows.length}
              {excludedRows.length > 0 ? ` · Excluded: ${excludedRows.length}` : ""}
            </span>
            {billable.length > 0 ? (
              <Button type="button" size="sm" variant="outline" onClick={selectAllBillable}>
                Select all billable
              </Button>
            ) : null}
            {testRows.length > 0 ? (
              <Button type="button" size="sm" variant="outline" onClick={selectAllTest}>
                Select all test
              </Button>
            ) : null}
            {selectedOrderIds.size > 0 ? (
              <Button type="button" size="sm" variant="ghost" onClick={clearOrderSelection}>
                Clear selection ({selectedOrderIds.size})
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || selectedOrderIds.size === 0}
              onClick={() => void markSelectedTest(true)}
            >
              Mark selected as test
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || selectedOrderIds.size === 0}
              onClick={() => void markSelectedTest(false)}
            >
              Unmark selected as test
            </Button>
          </div>

          {billable.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-800">
                Billable orders
                {productType === "customer_templated_song" ? (
                  <span className="font-normal text-gray-500">
                    {" "}
                    — select rows to exclude from this invoice by marking as test
                  </span>
                ) : null}
              </p>
              <div className="max-h-48 overflow-auto rounded border bg-white text-sm">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-gray-600">
                      <th className="p-2 w-8" />
                      <th className="p-2">External ID</th>
                      <th className="p-2">Recipient</th>
                      {productType === "customer_templated_song" ? (
                        <th className="p-2">Status</th>
                      ) : null}
                      <th className="p-2">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billable.map((row) => (
                      <tr key={row.order_id} className="border-b">
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.has(row.order_id)}
                            onChange={() => toggleOrderSelection(row.order_id)}
                            aria-label={`Select ${row.external_order_id}`}
                          />
                        </td>
                        <td className="p-2 font-mono text-xs">{row.external_order_id}</td>
                        <td className="p-2">{row.recipient_name ?? "—"}</td>
                        <td className="p-2 text-gray-600">{row.status ?? "—"}</td>
                        <td className="p-2 text-gray-500">
                          {row.completed_at?.slice(0, 10) ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {testRows.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-800">Test orders (not invoiced)</p>
              <div className="max-h-40 overflow-auto rounded border bg-white text-sm">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-gray-600">
                      <th className="p-2 w-8" />
                      <th className="p-2">External ID</th>
                      <th className="p-2">Recipient</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testRows.map((row) => (
                      <tr key={row.order_id} className="border-b">
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.has(row.order_id)}
                            onChange={() => toggleOrderSelection(row.order_id)}
                            aria-label={`Select test order ${row.external_order_id}`}
                          />
                        </td>
                        <td className="p-2 font-mono text-xs">{row.external_order_id}</td>
                        <td className="p-2">{row.recipient_name ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              type="button"
              disabled={billable.length === 0}
              onClick={() => setStep(3)}
            >
              Next: pricing
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <TemplatedSongPricingStep
            unitPrice={unitPrice}
            currency={currency}
            billableCount={billable.length}
            onUnitPriceChange={setUnitPrice}
            onCurrencyChange={setCurrency}
          />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">Notes (optional)</span>
            <textarea
              className="rounded-md border border-gray-300 px-3 py-2 min-h-[60px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button type="button" onClick={() => setStep(4)}>
              Next: confirm
            </Button>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Issue invoice for <strong>{selectedVendor?.name}</strong> (Templated song) with{" "}
            <strong>{billable.length}</strong> line(s) for period {periodFrom} – {periodTo}.
          </p>
          <p className="text-sm text-gray-600">
            Per-song rate: {currency} {unitPrice} · Subtotal: {currency}{" "}
            {(billable.length * (Number.parseFloat(unitPrice) || 0)).toFixed(2)}
          </p>
          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button type="button" disabled={busy} onClick={() => void submitInvoice()}>
              {busy ? "Creating…" : "Create invoice & PDF"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
