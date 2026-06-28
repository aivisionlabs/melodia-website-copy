"use client";

import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck } from "lucide-react";

import type { VendorFormState } from "./types";
import { VendorInvoiceBillingFields } from "./vendor-invoice-billing-fields";
import { autoSlug } from "./utils";

type Props = {
  createForm: VendorFormState;
  setCreateForm: Dispatch<SetStateAction<VendorFormState>>;
  creatingVendor: boolean;
  onCancel: () => void;
  onSubmit: () => void;
};

export function CreateVendorPanel({
  createForm,
  setCreateForm,
  creatingVendor,
  onCancel,
  onSubmit,
}: Props) {
  return (
    <div className="bg-white border rounded-lg p-4 space-y-3">
      <h2 className="font-semibold text-gray-900">Onboard New Vendor</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          placeholder="Vendor name"
          value={createForm.name}
          onChange={(event) =>
            setCreateForm((prev) => ({
              ...prev,
              name: event.target.value,
              slug: prev.slug || autoSlug(event.target.value),
            }))
          }
        />
        <Input
          placeholder="vendor-slug"
          value={createForm.slug}
          onChange={(event) =>
            setCreateForm((prev) => ({ ...prev, slug: event.target.value }))
          }
        />
        <Input
          placeholder="Icon / Logo URL (optional)"
          value={createForm.logo_url}
          onChange={(event) =>
            setCreateForm((prev) => ({
              ...prev,
              logo_url: event.target.value,
            }))
          }
        />
        <Input
          placeholder="Webhook URL (optional)"
          value={createForm.webhook_url}
          onChange={(event) =>
            setCreateForm((prev) => ({
              ...prev,
              webhook_url: event.target.value,
            }))
          }
        />
        <Input
          placeholder="Default price (optional)"
          type="number"
          min="0"
          step="0.01"
          value={createForm.default_price}
          onChange={(event) =>
            setCreateForm((prev) => ({
              ...prev,
              default_price: event.target.value,
            }))
          }
        />
      </div>
      <VendorInvoiceBillingFields form={createForm} setForm={setCreateForm} />
      <div className="flex items-center gap-6 text-sm text-gray-700">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={createForm.sandbox}
            onChange={(event) =>
              setCreateForm((prev) => ({
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
            checked={createForm.active}
            onChange={(event) =>
              setCreateForm((prev) => ({
                ...prev,
                active: event.target.checked,
              }))
            }
          />
          Active
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={creatingVendor}>
          <ShieldCheck className="h-4 w-4 mr-2" />
          {creatingVendor ? "Creating..." : "Create Vendor"}
        </Button>
      </div>
    </div>
  );
}
