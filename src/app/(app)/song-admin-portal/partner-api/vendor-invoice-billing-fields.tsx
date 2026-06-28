"use client";

import type { Dispatch, SetStateAction } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { VendorFormState } from "./types";

type Props = {
  form: VendorFormState;
  setForm: Dispatch<SetStateAction<VendorFormState>>;
};

export function VendorInvoiceBillingFields({ form, setForm }: Props) {
  return (
    <div className="space-y-3 border rounded-md p-3 bg-gray-50">
      <p className="text-sm font-medium text-gray-900">Invoice billing (To)</p>
      <Input
        placeholder="Legal entity name"
        value={form.invoice_legal_entity_name}
        onChange={(event) =>
          setForm((prev) => ({
            ...prev,
            invoice_legal_entity_name: event.target.value,
          }))
        }
      />
      <Textarea
        placeholder="Billing address (one line per row)"
        rows={4}
        value={form.invoice_address}
        onChange={(event) =>
          setForm((prev) => ({
            ...prev,
            invoice_address: event.target.value,
          }))
        }
      />
      <Input
        placeholder="GST number"
        value={form.invoice_gst_number}
        onChange={(event) =>
          setForm((prev) => ({
            ...prev,
            invoice_gst_number: event.target.value,
          }))
        }
      />
      <Input
        placeholder="Mobile number (e.g. +91 98759 98408)"
        value={form.invoice_mobile}
        onChange={(event) =>
          setForm((prev) => ({
            ...prev,
            invoice_mobile: event.target.value,
          }))
        }
      />
    </div>
  );
}
