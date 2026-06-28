"use client";

import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronUp,
  RefreshCcw,
  Save,
} from "lucide-react";

import type { VendorFormState } from "./types";
import { VendorInvoiceBillingFields } from "./vendor-invoice-billing-fields";

type Props = {
  open: boolean;
  onToggleOpen: () => void;
  selectedVendorForm: VendorFormState;
  setSelectedVendorForm: Dispatch<SetStateAction<VendorFormState>>;
  onRotateWebhookSecret: () => void;
  onSave: () => void;
  savingVendor: boolean;
};

export function VendorSettingsSection({
  open,
  onToggleOpen,
  selectedVendorForm,
  setSelectedVendorForm,
  onRotateWebhookSecret,
  onSave,
  savingVendor,
}: Props) {
  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggleOpen}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <h2 className="font-semibold text-gray-900">Vendor Settings</h2>
        {open ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t">
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={onRotateWebhookSecret}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Rotate Webhook Secret
            </Button>
            <Button onClick={onSave} disabled={savingVendor}>
              <Save className="h-4 w-4 mr-2" />
              {savingVendor ? "Saving..." : "Save Changes"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              value={selectedVendorForm.name}
              onChange={(event) =>
                setSelectedVendorForm((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              placeholder="Vendor name"
            />
            <Input
              value={selectedVendorForm.slug}
              onChange={(event) =>
                setSelectedVendorForm((prev) => ({
                  ...prev,
                  slug: event.target.value,
                }))
              }
              placeholder="vendor-slug"
            />
            <Input
              value={selectedVendorForm.logo_url}
              onChange={(event) =>
                setSelectedVendorForm((prev) => ({
                  ...prev,
                  logo_url: event.target.value,
                }))
              }
              placeholder="Icon / Logo URL"
            />
            <Input
              value={selectedVendorForm.webhook_url}
              onChange={(event) =>
                setSelectedVendorForm((prev) => ({
                  ...prev,
                  webhook_url: event.target.value,
                }))
              }
              placeholder="Webhook URL"
            />
            <Input
              value={selectedVendorForm.default_price}
              onChange={(event) =>
                setSelectedVendorForm((prev) => ({
                  ...prev,
                  default_price: event.target.value,
                }))
              }
              placeholder="Default price (blank to clear)"
              type="number"
              min="0"
              step="0.01"
            />
          </div>

          <VendorInvoiceBillingFields
            form={selectedVendorForm}
            setForm={setSelectedVendorForm}
          />

          <div className="flex items-center gap-6 text-sm text-gray-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedVendorForm.sandbox}
                onChange={(event) =>
                  setSelectedVendorForm((prev) => ({
                    ...prev,
                    sandbox: event.target.checked,
                  }))
                }
              />
              Sandbox vendor
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedVendorForm.active}
                onChange={(event) =>
                  setSelectedVendorForm((prev) => ({
                    ...prev,
                    active: event.target.checked,
                  }))
                }
              />
              Active
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
