"use client";

type Props = {
  unitPrice: string;
  currency: string;
  billableCount: number;
  onUnitPriceChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
};

export function TemplatedSongPricingStep({
  unitPrice,
  currency,
  billableCount,
  onUnitPriceChange,
  onCurrencyChange,
}: Props) {
  const unit = Number.parseFloat(unitPrice) || 0;
  const total = unit * billableCount;

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900">Per-song pricing</h3>
      <p className="text-sm text-gray-600">
        One rate applies to all {billableCount} billable order
        {billableCount === 1 ? "" : "s"} on this invoice.
      </p>
      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">Currency</span>
          <input
            className="rounded-md border border-gray-300 px-3 py-2 w-24"
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">Price per song</span>
          <input
            type="number"
            min={0}
            step="0.01"
            className="rounded-md border border-gray-300 px-3 py-2 w-40"
            value={unitPrice}
            onChange={(e) => onUnitPriceChange(e.target.value)}
          />
        </label>
      </div>
      <p className="text-base font-medium text-gray-900">
        Estimated subtotal: {currency} {total.toFixed(2)}
      </p>
    </div>
  );
}
