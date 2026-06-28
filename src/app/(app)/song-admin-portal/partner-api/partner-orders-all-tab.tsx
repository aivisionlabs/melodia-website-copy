"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Pagination from "@/components/admin/Pagination";
import { useToastHelpers } from "@/hooks/use-toast";
import type { PartnerApiVendor } from "./types";
import { PRODUCT_TYPES } from "./types";

type TemplateOption = {
  id: number;
  title: string;
  language: string;
};

type OrderRow = {
  id: number;
  vendor_id: number;
  vendor_name: string;
  vendor_slug: string;
  external_order_id: string;
  product_type: string;
  product_label: string;
  status: string;
  order_token: string | null;
  created_at: string;
  completed_at: string | null;
  amount_charged: string | null;
  currency: string | null;
  is_test_order?: boolean;
  is_invoiced?: boolean;
};

const PAGE_SIZE = 50;

/** Product types that have a vendor-facing URL we can resolve in admin. */
const LINKABLE_PRODUCT_TYPES = new Set([
  "customer_templated_song",
  "customer_custom_song",
  "rj_show",
]);

const STATUS_OPTIONS = [
  "pending",
  "form_submitted",
  "lyrics_generation_inprogress",
  "lyrics_ready_for_review",
  "lyrics_revision_requested",
  "lyrics_approved",
  "song_generation_inprogress",
  "completed",
  "failed",
  "processing",
] as const;

type Props = {
  vendors: PartnerApiVendor[];
};

export function PartnerOrdersAllTab({ vendors }: Props) {
  const toast = useToastHelpers();
  const [loading, setLoading] = useState(true);
  const [linkBusyOrderId, setLinkBusyOrderId] = useState<number | null>(null);
  const [retryBusyOrderId, setRetryBusyOrderId] = useState<number | null>(null);
  const [reviseModal, setReviseModal] = useState<{ orderId: number; selectedTemplateId: number | null } | null>(null);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [reviseBusy, setReviseBusy] = useState(false);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [vendorFilter, setVendorFilter] = useState<string>("");
  const [productFilter, setProductFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (vendorFilter) params.set("vendor_id", vendorFilter);
      if (productFilter) params.set("product_type", productFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/partner-api/orders?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load orders");
      setOrders(data.orders || []);
      setTotal(typeof data.total === "number" ? data.total : 0);
    } catch (e: unknown) {
      toast.error(
        "Could not load orders",
        e instanceof Error ? e.message : String(e),
      );
    } finally {
      setLoading(false);
    }
  }, [page, vendorFilter, productFilter, statusFilter]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const resetFilters = () => {
    setVendorFilter("");
    setProductFilter("");
    setStatusFilter("");
    setPage(1);
  };

  const copyCustomerLink = async (orderId: number) => {
    setLinkBusyOrderId(orderId);
    try {
      const res = await fetch(
        `/api/admin/partner-api/orders/${orderId}/customer-link`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to resolve link",
        );
      }
      const url = data.customer_link as string;
      await navigator.clipboard.writeText(url);
      const hint = data.minted_new_token
        ? "New order token saved. Customer URL copied."
        : "Customer URL copied.";
      toast.success("Link copied", hint);
      void fetchOrders();
    } catch (e: unknown) {
      toast.error(
        "Could not create link",
        e instanceof Error ? e.message : String(e),
      );
    } finally {
      setLinkBusyOrderId(null);
    }
  };

  const openReviseModal = async (orderId: number) => {
    setReviseModal({ orderId, selectedTemplateId: null });
    setTemplatesLoading(true);
    try {
      const res = await fetch("/api/admin/templated-songs");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load templates");
      const list: TemplateOption[] = (data.templatedSongs ?? []).map((t: any) => ({
        id: t.id,
        title: t.title,
        language: t.language ?? "",
      }));
      setTemplates(list);
      if (list.length > 0) {
        setReviseModal((prev) => prev ? { ...prev, selectedTemplateId: list[0].id } : prev);
      }
    } catch (e: unknown) {
      toast.error("Could not load templates", e instanceof Error ? e.message : String(e));
      setReviseModal(null);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const confirmRevise = async () => {
    if (!reviseModal) return;
    setReviseBusy(true);
    try {
      const res = await fetch(
        `/api/admin/partner-api/orders/${reviseModal.orderId}/revise`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            reviseModal.selectedTemplateId
              ? { templateId: reviseModal.selectedTemplateId }
              : {},
          ),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Failed to revise order");
      }
      toast.success("Revision initiated", "A new song is being generated.");
      setReviseModal(null);
      void fetchOrders();
    } catch (e: unknown) {
      toast.error("Could not revise order", e instanceof Error ? e.message : String(e));
    } finally {
      setReviseBusy(false);
    }
  };

  const retryOrder = async (orderId: number) => {
    setRetryBusyOrderId(orderId);
    try {
      const res = await fetch(
        `/api/admin/partner-api/orders/${orderId}/retry`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to retry order",
        );
      }
      toast.success("Retry initiated", "Song generation has been restarted.");
      void fetchOrders();
    } catch (e: unknown) {
      toast.error(
        "Could not retry order",
        e instanceof Error ? e.message : String(e),
      );
    } finally {
      setRetryBusyOrderId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Vendor
          </label>
          <select
            value={vendorFilter}
            onChange={(e) => {
              setPage(1);
              setVendorFilter(e.target.value);
            }}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm min-w-[180px] bg-white"
          >
            <option value="">All vendors</option>
            {vendors.map((v) => (
              <option key={v.id} value={String(v.id)}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Product type
          </label>
          <select
            value={productFilter}
            onChange={(e) => {
              setPage(1);
              setProductFilter(e.target.value);
            }}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm min-w-[200px] bg-white"
          >
            <option value="">All products</option>
            {PRODUCT_TYPES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value);
            }}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm min-w-[200px] bg-white"
          >
            <option value="">Any status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={resetFilters}
          className="text-sm text-gray-600 underline-offset-2 hover:underline"
        >
          Clear filters
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-600 text-sm">
          Loading orders…
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white border rounded-lg p-8 text-center text-gray-500 text-sm">
          No orders match these filters.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border rounded-lg bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Vendor</th>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">External ID</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((o) => {
                  const customerPath =
                    o.order_token && o.vendor_slug
                      ? `/vendor/${o.vendor_slug}/order/${o.order_token}`
                      : null;
                  const canResolveLink = LINKABLE_PRODUCT_TYPES.has(o.product_type);
                  const linkBusy = linkBusyOrderId === o.id;
                  const retryBusy = retryBusyOrderId === o.id;
                  const canRetry =
                    o.status === "failed" &&
                    o.product_type === "customer_templated_song";
                  const canRevise =
                    o.status === "completed" &&
                    o.product_type === "customer_templated_song";
                  return (
                    <tr key={o.id} className="text-gray-800">
                      <td className="px-3 py-2 tabular-nums font-mono text-xs">
                        {o.id}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">
                          {o.vendor_name}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {o.vendor_slug}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-gray-900">{o.product_label}</div>
                        <div className="text-xs text-gray-500 font-mono">
                          {o.product_type}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs max-w-[140px] truncate" title={o.external_order_id}>
                        {o.external_order_id}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className={`rounded px-1.5 py-0.5 text-xs ${o.status === "failed" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>
                            {o.status}
                          </span>
                          {o.is_test_order ? (
                            <span className="rounded px-1.5 py-0.5 text-xs bg-amber-100 text-amber-800">
                              Test
                            </span>
                          ) : null}
                          {o.is_invoiced ? (
                            <span className="rounded px-1.5 py-0.5 text-xs bg-green-100 text-green-800">
                              Invoiced
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                        {new Date(o.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        <div className="flex flex-wrap items-center gap-2">
                          {customerPath ? (
                            <Link
                              href={customerPath}
                              className="text-yellow-700 hover:underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Open
                            </Link>
                          ) : null}
                          {canResolveLink ? (
                            <button
                              type="button"
                              disabled={linkBusy}
                              onClick={() => void copyCustomerLink(o.id)}
                              className="text-yellow-800 font-medium hover:underline disabled:opacity-50 disabled:no-underline"
                            >
                              {linkBusy
                                ? "…"
                                : customerPath
                                  ? "Copy URL"
                                  : "Create link"}
                            </button>
                          ) : (
                            !customerPath ? (
                              <span className="text-gray-400" title="Deprecated product type is not linkable">
                                Deprecated type
                              </span>
                            ) : null
                          )}
                          {canRetry ? (
                            <button
                              type="button"
                              disabled={retryBusy}
                              onClick={() => void retryOrder(o.id)}
                              className="text-red-700 font-medium hover:underline disabled:opacity-50 disabled:no-underline"
                            >
                              {retryBusy ? "Retrying…" : "Retry"}
                            </button>
                          ) : null}
                          {canRevise ? (
                            <button
                              type="button"
                              onClick={() => void openReviseModal(o.id)}
                              className="text-blue-700 font-medium hover:underline"
                            >
                              Revise
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={page}
            totalItems={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </>
      )}
      {reviseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md space-y-4">
            <h3 className="font-semibold text-gray-900">Revise Templated Song</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Template
              </label>
              {templatesLoading ? (
                <p className="text-sm text-gray-500">Loading templates…</p>
              ) : (
                <select
                  value={reviseModal.selectedTemplateId ?? ""}
                  onChange={(e) =>
                    setReviseModal((prev) =>
                      prev ? { ...prev, selectedTemplateId: Number(e.target.value) } : prev,
                    )
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}{t.language ? ` (${t.language})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setReviseModal(null)}
                disabled={reviseBusy}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmRevise()}
                disabled={reviseBusy || templatesLoading || !reviseModal.selectedTemplateId}
                className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {reviseBusy ? "Revising…" : "Confirm revision"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
