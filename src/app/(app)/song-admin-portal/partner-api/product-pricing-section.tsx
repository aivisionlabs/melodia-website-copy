"use client";

import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Save, Trash2 } from "lucide-react";

import type { PricingFormState, ProductPrice } from "./types";
import { PRODUCT_TYPES } from "./types";

type Props = {
  open: boolean;
  onToggleOpen: () => void;
  pricesLoading: boolean;
  prices: ProductPrice[];
  pricingForm: PricingFormState;
  setPricingForm: Dispatch<SetStateAction<PricingFormState>>;
  savingPrices: Record<string, boolean>;
  deactivatingPriceId: number | null;
  onSaveProductPrice: (productType: string) => void;
  onRemoveProductPrice: (price: ProductPrice) => void;
};

export function ProductPricingSection({
  open,
  onToggleOpen,
  pricesLoading,
  prices,
  pricingForm,
  setPricingForm,
  savingPrices,
  deactivatingPriceId,
  onSaveProductPrice,
  onRemoveProductPrice,
}: Props) {
  return (
    <div className="bg-white border rounded-lg">
      <button
        type="button"
        onClick={onToggleOpen}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="text-left">
          <h2 className="font-semibold text-gray-900">Product Pricing</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Set a price for each product this vendor offers. Save each row
            individually.
          </p>
        </div>
        {open ? (
          <ChevronUp className="h-5 w-5 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {pricesLoading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : (
            <div className="space-y-3">
              {PRODUCT_TYPES.map((pt) => {
                const existing = prices.find(
                  (p) => p.product_type === pt.value && p.active,
                );
                const entry = pricingForm[pt.value] ?? {
                  price: "",
                  currency: "INR",
                };
                const isSaving = savingPrices[pt.value] ?? false;
                const isRemoving = existing
                  ? deactivatingPriceId === existing.id
                  : false;
                const isDirty =
                  entry.price !== (existing?.price ?? "") ||
                  entry.currency !== (existing?.currency ?? "INR");

                return (
                  <div
                    key={pt.value}
                    className="grid grid-cols-1 md:grid-cols-[1fr_140px_100px_auto] gap-2 items-center border rounded-lg px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {pt.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                        {pt.description}
                      </p>
                      {existing ? (
                        <p className="text-xs text-gray-400 mt-1">
                          Last updated{" "}
                          {new Date(existing.updated_at).toLocaleDateString()}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-500 mt-1">
                          Not configured
                        </p>
                      )}
                    </div>

                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 99.00"
                      value={entry.price}
                      onChange={(e) =>
                        setPricingForm((prev) => ({
                          ...prev,
                          [pt.value]: { ...entry, price: e.target.value },
                        }))
                      }
                    />

                    <Input
                      placeholder="INR"
                      value={entry.currency}
                      maxLength={10}
                      onChange={(e) =>
                        setPricingForm((prev) => ({
                          ...prev,
                          [pt.value]: {
                            ...entry,
                            currency: e.target.value.toUpperCase(),
                          },
                        }))
                      }
                    />

                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        size="sm"
                        onClick={() => onSaveProductPrice(pt.value)}
                        disabled={isSaving || !entry.price}
                        variant={isDirty && existing ? "default" : "outline"}
                      >
                        <Save className="h-3 w-3 mr-1" />
                        {isSaving ? "Saving..." : existing ? "Update" : "Add"}
                      </Button>
                      {existing && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isRemoving}
                          onClick={() => onRemoveProductPrice(existing)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
