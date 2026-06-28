"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToastHelpers } from "@/hooks/use-toast";
import { trackCTAEvent } from "@/lib/analytics";
import { Plus } from "lucide-react";

import { ApiKeysSection } from "./api-keys-section";
import { CreateVendorPanel } from "./create-vendor-panel";
import { ProductPricingSection } from "./product-pricing-section";
import { SecretsBanners } from "./secrets-banners";
import { VendorList } from "./vendor-list";
import { VendorSettingsSection } from "./vendor-settings-section";
import { PartnerOrdersAllTab } from "./partner-orders-all-tab";
import { PartnerOrdersByVendorTab } from "./partner-orders-by-vendor-tab";
import { PartnerInvoicesTab } from "./partner-invoices-tab";
import type {
  PartnerApiCredential,
  PartnerApiVendor,
  PricingFormState,
  ProductPrice,
  VendorFormState,
} from "./types";
import { buildEmptyPricingForm, emptyVendorForm } from "./types";

type PartnerApiMainTab = "vendors" | "orders_by_vendor" | "orders_all" | "invoices";

export function PartnerApiAdminPage() {
  const toast = useToastHelpers();
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<PartnerApiVendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [selectedVendorForm, setSelectedVendorForm] =
    useState<VendorFormState>(emptyVendorForm);
  const [credentials, setCredentials] = useState<PartnerApiCredential[]>([]);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [prices, setPrices] = useState<ProductPrice[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricingForm, setPricingForm] = useState<PricingFormState>(
    buildEmptyPricingForm(),
  );
  const [savingPrices, setSavingPrices] = useState<Record<string, boolean>>({});
  const [deactivatingPriceId, setDeactivatingPriceId] = useState<number | null>(
    null,
  );
  const [showCreateVendor, setShowCreateVendor] = useState(false);
  const [createForm, setCreateForm] =
    useState<VendorFormState>(emptyVendorForm);
  const [creatingVendor, setCreatingVendor] = useState(false);
  const [savingVendor, setSavingVendor] = useState(false);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [credentialName, setCredentialName] = useState("");
  const [credentialExpiry, setCredentialExpiry] = useState("");
  const [creatingCredential, setCreatingCredential] = useState(false);
  const [deactivatingCredentialId, setDeactivatingCredentialId] = useState<
    number | null
  >(null);
  const [showVendorSettings, setShowVendorSettings] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [apiKeysOpen, setApiKeysOpen] = useState(false);
  const [mainTab, setMainTab] = useState<PartnerApiMainTab>("vendors");

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === selectedVendorId) ?? null,
    [vendors, selectedVendorId],
  );

  useEffect(() => {
    void fetchVendors();
  }, []);

  useEffect(() => {
    if (!selectedVendor) return;
    setSelectedVendorForm({
      name: selectedVendor.name,
      slug: selectedVendor.slug,
      logo_url: selectedVendor.logo_url ?? "",
      webhook_url: selectedVendor.webhook_url ?? "",
      invoice_legal_entity_name: selectedVendor.invoice_legal_entity_name ?? "",
      invoice_address: selectedVendor.invoice_address ?? "",
      invoice_gst_number: selectedVendor.invoice_gst_number ?? "",
      invoice_mobile: selectedVendor.invoice_mobile ?? "",
      sandbox: selectedVendor.sandbox,
      active: selectedVendor.active,
      default_price: selectedVendor.default_price ?? "",
      currency: selectedVendor.default_price_currency ?? "INR",
    });
    void fetchCredentials(selectedVendor.id);
    void fetchPrices(selectedVendor.id);
  }, [selectedVendor]);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/partner-api/vendors");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load vendors");
      const nextVendors = data.vendors || [];
      setVendors(nextVendors);
    } catch (error: unknown) {
      toast.error(
        "Failed to load vendors",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchCredentials = async (vendorId: number) => {
    setCredentialsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/partner-api/vendors/${vendorId}/credentials`,
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to load credentials");
      setCredentials(data.credentials || []);
    } catch (error: unknown) {
      toast.error(
        "Failed to load credentials",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setCredentialsLoading(false);
    }
  };

  const fetchPrices = async (vendorId: number) => {
    setPricesLoading(true);
    try {
      const response = await fetch(
        `/api/admin/partner-api/vendors/${vendorId}/prices`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load prices");
      const fetched: ProductPrice[] = data.prices || [];
      setPrices(fetched);
      setPricingForm((prev) => {
        const next = { ...prev };
        for (const p of fetched) {
          if (p.active) {
            next[p.product_type] = { price: p.price, currency: p.currency };
          }
        }
        return next;
      });
    } catch (error: unknown) {
      toast.error(
        "Failed to load prices",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setPricesLoading(false);
    }
  };

  const createVendor = async () => {
    if (!createForm.name.trim() || !createForm.slug.trim()) {
      toast.error("Validation error", "Vendor name and slug are required.");
      return;
    }
    setCreatingVendor(true);
    try {
      trackCTAEvent.ctaClick("partner_api_vendor_create", "admin_partner_api");
      const response = await fetch("/api/admin/partner-api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name.trim(),
          slug: createForm.slug.trim(),
          logo_url: createForm.logo_url.trim() || undefined,
          webhook_url: createForm.webhook_url.trim() || undefined,
          invoice_legal_entity_name:
            createForm.invoice_legal_entity_name.trim() || undefined,
          invoice_address: createForm.invoice_address.trim() || undefined,
          invoice_gst_number: createForm.invoice_gst_number.trim() || undefined,
          invoice_mobile: createForm.invoice_mobile.trim() || undefined,
          sandbox: createForm.sandbox,
          active: createForm.active,
          default_price: createForm.default_price
            ? Number(createForm.default_price)
            : undefined,
          currency: createForm.currency || "INR",
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to create vendor");
      toast.success(
        "Vendor created",
        `${data.vendor.name} has been onboarded.`,
      );
      setNewWebhookSecret(data.webhook_secret || null);
      setCreateForm(emptyVendorForm);
      setShowCreateVendor(false);
      await fetchVendors();
      setSelectedVendorId(data.vendor.id);
    } catch (error: unknown) {
      toast.error(
        "Failed to create vendor",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setCreatingVendor(false);
    }
  };

  const saveVendor = async () => {
    if (!selectedVendor) return;
    setSavingVendor(true);
    try {
      trackCTAEvent.ctaClick("partner_api_vendor_update", "admin_partner_api");
      const clearPrice = !selectedVendorForm.default_price.trim();
      const response = await fetch(
        `/api/admin/partner-api/vendors/${selectedVendor.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: selectedVendorForm.name.trim(),
            slug: selectedVendorForm.slug.trim(),
            logo_url: selectedVendorForm.logo_url.trim() || "",
            webhook_url: selectedVendorForm.webhook_url.trim() || "",
            invoice_legal_entity_name:
              selectedVendorForm.invoice_legal_entity_name.trim() || "",
            invoice_address: selectedVendorForm.invoice_address.trim() || "",
            invoice_gst_number: selectedVendorForm.invoice_gst_number.trim() || "",
            invoice_mobile: selectedVendorForm.invoice_mobile.trim() || "",
            sandbox: selectedVendorForm.sandbox,
            active: selectedVendorForm.active,
            default_price: clearPrice
              ? undefined
              : Number(selectedVendorForm.default_price),
            clear_default_price: clearPrice,
            currency: selectedVendorForm.currency || "INR",
          }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to update vendor");
      toast.success("Vendor updated", "Changes saved successfully.");
      await fetchVendors();
    } catch (error: unknown) {
      toast.error(
        "Failed to update vendor",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setSavingVendor(false);
    }
  };

  const rotateWebhookSecret = async () => {
    if (!selectedVendor) return;
    try {
      trackCTAEvent.ctaClick(
        "partner_api_rotate_webhook_secret",
        "admin_partner_api",
      );
      const response = await fetch(
        `/api/admin/partner-api/vendors/${selectedVendor.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rotate_webhook_secret: true }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to rotate webhook secret");
      setNewWebhookSecret(data.webhook_secret || null);
      toast.success(
        "Webhook secret rotated",
        "Share the new secret with the vendor.",
      );
    } catch (error: unknown) {
      toast.error(
        "Failed to rotate secret",
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const generateCredential = async () => {
    if (!selectedVendor) return;
    if (!credentialName.trim()) {
      toast.error("Validation error", "Credential name is required.");
      return;
    }
    setCreatingCredential(true);
    try {
      trackCTAEvent.ctaClick("partner_api_generate_key", "admin_partner_api");
      const response = await fetch(
        `/api/admin/partner-api/vendors/${selectedVendor.id}/credentials`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: credentialName.trim(),
            expires_at: credentialExpiry
              ? new Date(credentialExpiry).toISOString()
              : undefined,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate key");
      setNewApiKey(data.api_key || null);
      setCredentialName("");
      setCredentialExpiry("");
      toast.success(
        "API key generated",
        "Copy and share it now. It will not be shown again.",
      );
      await fetchCredentials(selectedVendor.id);
    } catch (error: unknown) {
      toast.error(
        "Failed to generate API key",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setCreatingCredential(false);
    }
  };

  const deactivateCredential = async (credentialId: number) => {
    if (!selectedVendor) return;
    setDeactivatingCredentialId(credentialId);
    try {
      trackCTAEvent.ctaClick("partner_api_deactivate_key", "admin_partner_api");
      const response = await fetch(
        `/api/admin/partner-api/vendors/${selectedVendor.id}/credentials/${credentialId}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to deactivate key");
      toast.success(
        "API key deactivated",
        "The key can no longer access partner APIs.",
      );
      await fetchCredentials(selectedVendor.id);
    } catch (error: unknown) {
      toast.error(
        "Failed to deactivate key",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setDeactivatingCredentialId(null);
    }
  };

  const saveProductPrice = async (productType: string) => {
    if (!selectedVendor) return;
    const entry = pricingForm[productType];
    if (!entry?.price || Number(entry.price) <= 0) {
      toast.error("Validation error", "Price must be a positive number.");
      return;
    }
    setSavingPrices((prev) => ({ ...prev, [productType]: true }));
    try {
      const response = await fetch(
        `/api/admin/partner-api/vendors/${selectedVendor.id}/prices`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_type: productType,
            price: Number(entry.price),
            currency: entry.currency || "INR",
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save price");
      toast.success(
        "Price saved",
        data.message || "Price updated successfully.",
      );
      await fetchPrices(selectedVendor.id);
    } catch (error: unknown) {
      toast.error(
        "Failed to save price",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setSavingPrices((prev) => ({ ...prev, [productType]: false }));
    }
  };

  const removeProductPrice = async (price: ProductPrice) => {
    if (!selectedVendor) return;
    setDeactivatingPriceId(price.id);
    try {
      const response = await fetch(
        `/api/admin/partner-api/vendors/${selectedVendor.id}/prices?product_type=${price.product_type}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to remove price");
      toast.success("Price removed", "The product price has been deactivated.");
      setPricingForm((prev) => ({
        ...prev,
        [price.product_type]: { price: "", currency: "INR" },
      }));
      await fetchPrices(selectedVendor.id);
    } catch (error: unknown) {
      toast.error(
        "Failed to remove price",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setDeactivatingPriceId(null);
    }
  };

  const copyToClipboard = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success("Copied", `${label} copied to clipboard.`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-600">Loading partner API vendors...</div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Partner API</h1>
          <p className="mt-1 text-sm text-gray-600">
            Vendors, keys, pricing, and partner orders across all product types.
          </p>
        </div>
        {mainTab === "vendors" ? (
          <Button
            onClick={() => {
              trackCTAEvent.ctaClick(
                "partner_api_vendor_open_create",
                "admin_partner_api",
              );
              setShowCreateVendor((prev) => !prev);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Vendor
          </Button>
        ) : null}
      </div>

      <div className="border-b border-gray-200">
        <nav
          className="-mb-px flex flex-wrap gap-x-6 gap-y-1"
          aria-label="Partner API sections"
        >
          <button
            type="button"
            onClick={() => setMainTab("vendors")}
            className={`
              whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                mainTab === "vendors"
                  ? "border-yellow-600 text-yellow-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            Vendors
          </button>
          <button
            type="button"
            onClick={() => setMainTab("orders_by_vendor")}
            className={`
              whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                mainTab === "orders_by_vendor"
                  ? "border-yellow-600 text-yellow-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            Orders by vendor
          </button>
          <button
            type="button"
            onClick={() => setMainTab("orders_all")}
            className={`
              whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                mainTab === "orders_all"
                  ? "border-yellow-600 text-yellow-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            All orders
          </button>
          <button
            type="button"
            onClick={() => setMainTab("invoices")}
            className={`
              whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                mainTab === "invoices"
                  ? "border-yellow-600 text-yellow-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            Invoices
          </button>
        </nav>
      </div>

      {mainTab === "orders_by_vendor" ? <PartnerOrdersByVendorTab /> : null}

      {mainTab === "orders_all" ? (
        <PartnerOrdersAllTab vendors={vendors} />
      ) : null}

      {mainTab === "invoices" ? <PartnerInvoicesTab vendors={vendors} /> : null}

      {mainTab !== "vendors" ? null : (
        <>
          <SecretsBanners
            newWebhookSecret={newWebhookSecret}
            newApiKey={newApiKey}
            onCopy={copyToClipboard}
          />

          {showCreateVendor && (
            <CreateVendorPanel
              createForm={createForm}
              setCreateForm={setCreateForm}
              creatingVendor={creatingVendor}
              onCancel={() => setShowCreateVendor(false)}
              onSubmit={createVendor}
            />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <VendorList
              vendors={vendors}
              selectedVendorId={selectedVendorId}
              onSelectVendor={setSelectedVendorId}
            />

            <div className="lg:col-span-2 space-y-6">
              {!selectedVendor ? (
                <div className="bg-white border rounded-lg p-8 text-center text-gray-500">
                  Select a vendor to manage onboarding and keys.
                </div>
              ) : (
                <>
                  <VendorSettingsSection
                    open={showVendorSettings}
                    onToggleOpen={() => setShowVendorSettings((v) => !v)}
                    selectedVendorForm={selectedVendorForm}
                    setSelectedVendorForm={setSelectedVendorForm}
                    onRotateWebhookSecret={rotateWebhookSecret}
                    onSave={saveVendor}
                    savingVendor={savingVendor}
                  />

                  <ProductPricingSection
                    open={pricingOpen}
                    onToggleOpen={() => setPricingOpen((prev) => !prev)}
                    pricesLoading={pricesLoading}
                    prices={prices}
                    pricingForm={pricingForm}
                    setPricingForm={setPricingForm}
                    savingPrices={savingPrices}
                    deactivatingPriceId={deactivatingPriceId}
                    onSaveProductPrice={saveProductPrice}
                    onRemoveProductPrice={removeProductPrice}
                  />

                  <ApiKeysSection
                    open={apiKeysOpen}
                    onToggleOpen={() => setApiKeysOpen((prev) => !prev)}
                    credentialName={credentialName}
                    setCredentialName={setCredentialName}
                    credentialExpiry={credentialExpiry}
                    setCredentialExpiry={setCredentialExpiry}
                    onGenerateCredential={generateCredential}
                    creatingCredential={creatingCredential}
                    credentialsLoading={credentialsLoading}
                    credentials={credentials}
                    deactivatingCredentialId={deactivatingCredentialId}
                    onDeactivateCredential={deactivateCredential}
                  />
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
